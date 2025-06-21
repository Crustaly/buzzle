# Buzzle: Screenless AI Learning for Every Child

**Built for the AWS Breaking Barriers Virtual Challenge 2025**

Buzzle is a screen-free, AI-powered educational game that uses AWS generative AI and telecom infrastructure to bring personalized learning to children anywhere in the world — even offline. It combines tactile interaction, voice synthesis, and dynamic content generation to reduce screen time and expand access to quality education.

## 🚀 Features
- Hands-on learning experience using physical tokens and a smart board
- Voice interactions powered by Amazon Polly
- Personalized question generation via Amazon Bedrock (Claude Sonnet)
- Real-time performance tracking stored in DynamoDB
- Offline access through 4G LTE (5G-ready architecture)
- Inclusive design with future support for braille-labeled tokens

## 🧱 Tech Stack
- ESP32 Dev Board + INMP441 Mic + RFID Reader (Hardware)
- AWS Lambda, Bedrock, Polly, DynamoDB, CloudWatch
- AWS Amplify for frontend demo deployment
- JavaScript (React) + Python (Lambda)

## 📁 Repository Structure
src/
├── components/ # React UI components
├── awsIntegration.js # (Optional) stubbed AWS connector
├── lambda_function.py # AWS Lambda handler (Python)
├── index.js, App.js # Frontend entry points

## 🧪 Virtual Demo
Try the web version hosted on AWS Amplify (link coming soon).

## 📜 License

This project is licensed under the **MIT License**.  
See [`LICENSE`](./LICENSE) for details.

---

## 🤝 Contributions
This project was created for a limited-time virtual hackathon. Contributions are welcome via pull requests or forks, especially around accessibility features and subject expansion.

---

## 🧾 Acknowledgments
- Built using AWS tools under the Breaking Barriers Hackathon
- Voice tech powered by Amazon Polly
- Generative logic powered by Claude Sonnet (Amazon Bedrock)

MIT License

Copyright (c) [2025] [Crystal Yang]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

