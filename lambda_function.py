import json
import boto3
import base64
import traceback

# Initialize AWS clients
bedrock = boto3.client("bedrock-runtime")
polly = boto3.client("polly")

# Map characters to Polly voices
VOICE_MAP = {"Princess Emma": "Ruth", "Olivia": "Danielle", "Liam": "Matthew"}

# If there is a list or check for characters, add 'Oliver' to it. For example:
# ALLOWED_CHARACTERS = ['Princess Emma', 'Olivia', 'Liam', 'Oliver']


# Generate Polly audio and return base64-encoded string
def get_polly_audio(text, voice_id):
    try:
        print(f"Generating Polly audio: {text[:80]}...")
        response = polly.synthesize_speech(
            Text=text, VoiceId=voice_id, OutputFormat="mp3", Engine="neural"
        )
        audio_data = response["AudioStream"].read()
        return base64.b64encode(audio_data).decode("utf-8")
    except Exception as e:
        print("Polly error:", str(e))
        print(traceback.format_exc())
        return None


# Generate feedback audio using provided character and message
def get_feedback_audio(character, is_correct, question_data):
    try:
        voice_id = VOICE_MAP[character]
        message = (
            question_data["correct_response"]
            if is_correct
            else question_data["wrong_response"]
        )
        return get_polly_audio(message, voice_id)
    except Exception as e:
        print("Feedback audio error:", str(e))
        return None


# Build prompt string for Claude
def build_prompt(mode, character, subject, level):
    # Define tone based on character
    tone = (
        "princess-like and royal"
        if character == "Princess Emma"
        else "friendly and encouraging"
    )

    if mode.lower() == "game":
        return f"""
You are {character}, a playful and enthusiastic guide.
Create a fun and educational game about {subject} at level {level}.
Use a {tone} tone.

Start with a short, engaging intro (1–2 sentences) where {character} welcomes the player.
Include the character's name and mention the topic.

Then, create 5 diverse and creative question-answer pairs with different correct answers.
If an answer is numeric, include both digit and word form like {{5, five}}.

Also include:
1. `outro_success`: Message if the player gets 3 or more correct (congratulatory, says next round will be harder)
2. `outro_retry`: Message if player gets 0–2 correct (encouraging, says next round will be easier)

Format your JSON like this:
{{
  "title": "Game Title",
  "intro": "Intro message",
  "outro_success": "Success outro message",
  "outro_retry": "Retry outro message",
  "questions": [
    {{
      "question": "What is 2 + 3?",
      "answer": "{{5, five}}",
      "correct_response": "That's right!",
      "wrong_response": "Oops! The correct answer is 5."
    }},
    ...
  ]
}}
"""
    else:
        return f"""
Create a short (under 80 words) educational explanation about {subject} at level {level}.
Use a {tone} tone.

Format as:
{{
  "title": "Lesson title",
  "content": "Short explanation"
}}
"""


# Utility to parse incoming body JSON
def parse_body(body):
    try:
        return json.loads(body) if isinstance(body, str) else body
    except Exception as e:
        print("JSON parse error:", str(e))
        return {}


# Lambda entry point
def lambda_handler(event, context):
    try:
        print("Event:", json.dumps(event))

        # CORS preflight
        if event.get("httpMethod") == "OPTIONS":
            return respond(200, {"message": "CORS OK"})

        # Parse body
        body = parse_body(event.get("body", "{}"))
        print("Parsed body:", json.dumps(body))

        # Handle feedback request
        if body.get("type") == "feedback":
            character = body.get("character")
            is_correct = body.get("is_correct", False)
            question_data = body.get("question_data")
            audio = get_feedback_audio(character, is_correct, question_data)
            return respond(200, {"audio": audio})

        # Handle game/lesson generation
        character = body.get("character")
        subject = body.get("subject")
        mode = body.get("mode")
        level = body.get("level")

        if not all([character, subject, mode, level]):
            return respond(400, {"error": "Missing required fields"})

        prompt = build_prompt(mode, character, subject, level)
        print("Prompt preview:", prompt[:300])

        # Call Bedrock Claude
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=json.dumps(
                {
                    "anthropic_version": "bedrock-2023-05-31",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1000,
                    "temperature": 0.7,
                }
            ),
            accept="application/json",
            contentType="application/json",
        )

        raw = json.loads(response["body"].read())
        generated = raw.get("content", [{}])[0].get("text", "").strip()
        print("Generated text:", generated[:300])

        result = json.loads(generated)

        # Process game mode output
        if mode.lower() == "game":
            required = ["title", "intro", "outro_success", "outro_retry", "questions"]
            if any(k not in result for k in required):
                raise ValueError("Missing one or more required fields")

            if (
                not isinstance(result["questions"], list)
                or len(result["questions"]) != 5
            ):
                raise ValueError("Expected 5 questions")

            voice_id = VOICE_MAP[character]

            # Audio generation
            result["intro_audio"] = get_polly_audio(result["intro"], voice_id)
            result["outro_success_audio"] = get_polly_audio(
                result["outro_success"], voice_id
            )
            result["outro_retry_audio"] = get_polly_audio(
                result["outro_retry"], voice_id
            )

            for i, q in enumerate(result["questions"]):
                q["audio"] = get_polly_audio(q["question"], voice_id)

        # Process learn mode output
        elif mode.lower() == "learn":
            if "title" not in result or "content" not in result:
                raise ValueError("Missing title or content")
            result["audio"] = get_polly_audio(result["content"], VOICE_MAP[character])

        return respond(200, result)

    except Exception as e:
        print("Unhandled error:", str(e))
        print(traceback.format_exc())
        return respond(500, {"error": str(e)})


# Build HTTP response
def respond(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }
