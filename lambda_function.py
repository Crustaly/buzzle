import json
import boto3
import base64
import traceback

bedrock = boto3.client("bedrock-runtime")
polly = boto3.client("polly")

# Map characters to Polly voices
VOICE_MAP = {"Princess Emma": "Ruth", "Olivia": "Danielle", "Liam": "Matthew"}

# Feedback messages for each character
FEEDBACK_MESSAGES = {
    "Princess Emma": {
        "correct": "Excellent work, my dear! You've answered correctly!",
        "incorrect": "Not quite right, my dear. The correct answer is: {answer}",
    },
    "Olivia": {
        "correct": "Great job! You got it right!",
        "incorrect": "Almost! The correct answer is: {answer}",
    },
    "Liam": {
        "correct": "Awesome! That's the right answer!",
        "incorrect": "Not quite. The correct answer is: {answer}",
    },
}


def get_polly_audio(text, voice_id):
    """Generate audio from text using Polly"""
    try:
        print(
            f"Generating Polly audio for text: {text[:100]}... with voice: {voice_id}"
        )
        response = polly.synthesize_speech(
            Text=text,
            VoiceId=voice_id,
            OutputFormat="mp3",
            Engine="neural",  # Use neural engine for better quality
        )

        # Convert audio stream to base64
        audio_data = response["AudioStream"].read()
        audio_base64 = base64.b64encode(audio_data).decode("utf-8")
        print(f"Successfully generated audio of length: {len(audio_base64)}")

        return audio_base64
    except Exception as e:
        print(f"Error generating Polly audio: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return None


def get_feedback_audio(character, is_correct, question_data):
    """Generate feedback audio based on character and correctness"""
    try:
        voice_id = VOICE_MAP[character]
        message = (
            question_data["correct_response"]
            if is_correct
            else question_data["wrong_response"]
        )
        return get_polly_audio(message, voice_id)
    except Exception as e:
        print(f"Error generating feedback audio: {str(e)}")
        return None


def build_prompt(mode, character, subject, level):
    if mode.lower() == "game":
        tone = (
            "princess-like and royal"
            if character == "Princess Emma"
            else "friendly and encouraging"
        )
        return f"""
You are {character}. Create a fun educational game about {subject} at level {level}.
Use a {tone} tone.
Generate exactly 5 question-answer pairs.

For each question, provide:
1. The question text
2. The correct answer (if it's a number, provide both numeric and word form like {{1, one}})
3. A dialogue response when the user gets it wrong (tell them the correct answer)
4. A congratulatory dialogue when they get it right

Format the response as a JSON object:
{{
  "title": "A fun title for the game",
  "questions": [
    {{
      "question": "Question 1",
      "answer": "Answer 1",
      "wrong_response": "Character's response when wrong",
      "correct_response": "Character's congratulatory message"
    }},
    ...
    {{
      "question": "Question 5",
      "answer": "Answer 5",
      "wrong_response": "Character's response when wrong",
      "correct_response": "Character's congratulatory message"
    }}
  ]
}}"""
    else:
        return f"""
Create a friendly, educational explanation about {subject} at level {level}.
Keep it simple and engaging, around 80 words.

Format the response as a JSON object:
{{
  "title": "A clear title for the lesson",
  "content": "The educational content here"
}}"""


def parse_body(body):
    try:
        if isinstance(body, str):
            return json.loads(body)
        return body
    except json.JSONDecodeError as e:
        print(f"Error parsing body: {str(e)}")
        print(f"Body content: {body}")
        return {}


def lambda_handler(event, context):
    try:
        # Log the incoming event for debugging
        print("Received event:", json.dumps(event))

        # Handle OPTIONS request for CORS
        if event.get("httpMethod") == "OPTIONS":
            return respond(200, {"message": "CORS preflight successful"})

        # Parse the body
        body = parse_body(event.get("body", "{}"))
        print("Parsed body:", json.dumps(body))

        # Check if this is a feedback request
        if body.get("type") == "feedback":
            character = body.get("character")
            is_correct = body.get("is_correct", False)
            question_data = body.get("question_data")

            feedback_audio = get_feedback_audio(character, is_correct, question_data)
            return respond(200, {"audio": feedback_audio})

        # Regular experience generation request
        character = body.get("character")
        subject = body.get("subject")
        mode = body.get("mode")
        level = body.get("level")

        # Log the extracted values for debugging
        print(
            "Extracted values:",
            {"character": character, "subject": subject, "mode": mode, "level": level},
        )

        # Check for missing or empty fields
        missing_fields = []
        if not character:
            missing_fields.append("character")
        if not subject:
            missing_fields.append("subject")
        if not mode:
            missing_fields.append("mode")
        if not level:
            missing_fields.append("level")

        if missing_fields:
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            print(error_msg)
            return respond(400, {"error": error_msg, "missing_fields": missing_fields})

        prompt = build_prompt(mode, character, subject, level)
        print(f"Generated prompt: {prompt}")

        print("Calling Bedrock...")
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=json.dumps(
                {
                    "anthropic_version": "bedrock-2023-05-31",
                    "messages": [{"role": "user", "content": prompt.strip()}],
                    "max_tokens": 1000,
                    "temperature": 0.7,
                }
            ),
            accept="application/json",
            contentType="application/json",
        )

        raw = json.loads(response["body"].read())
        print("Bedrock response:", json.dumps(raw))

        # Extract the content from the Claude 3 Haiku response format
        generated = raw.get("content", [{}])[0].get("text", "").strip()
        print(f"Generated content: {generated[:200]}...")

        try:
            result = json.loads(generated)
            print("Parsed JSON result:", json.dumps(result))

            if mode.lower() == "game":
                if "title" not in result or "questions" not in result:
                    raise ValueError("Missing title or questions")
                if (
                    not isinstance(result["questions"], list)
                    or len(result["questions"]) != 5
                ):
                    raise ValueError("Invalid questions format or count")

                # Generate audio for each question
                for i, question in enumerate(result["questions"]):
                    print(f"Generating audio for question {i+1}")
                    question_text = f"{question['question']}"
                    question["audio"] = get_polly_audio(
                        question_text, VOICE_MAP[character]
                    )
            else:
                if "title" not in result or "content" not in result:
                    raise ValueError("Missing title or content")
                # Generate audio for the content
                print("Generating audio for learn mode content")
                result["audio"] = get_polly_audio(
                    result["content"], VOICE_MAP[character]
                )

            print("Final result:", json.dumps(result))
            return respond(200, result)

        except json.JSONDecodeError as e:
            error_msg = f"Failed to parse Bedrock output: {str(e)}"
            print(error_msg)
            print(f"Raw output: {generated}")
            return respond(500, {"error": error_msg, "raw": generated})

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(error_msg)
        print(f"Traceback: {traceback.format_exc()}")
        return respond(500, {"error": error_msg})


def respond(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        "body": json.dumps(body),
    }
