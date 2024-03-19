from flask import Flask, request, jsonify
import face_recognition
import sys
import logging

app = Flask(__name__)

# Set up logging
logging.basicConfig(filename='api.log', level=logging.ERROR)

def perform_face_recognition(user_profile_image_path, captured_image_path):
    try:
        # Load images
        user_profile_image = face_recognition.load_image_file(user_profile_image_path)
        captured_image = face_recognition.load_image_file(captured_image_path)

        # Encode faces
        user_profile_encodings = face_recognition.face_encodings(user_profile_image)
        captured_encodings = face_recognition.face_encodings(captured_image)

        if not user_profile_encodings:
            raise ValueError("No face detected in the user profile image")
        if not captured_encodings:
            raise ValueError("No face detected in the captured image")

        user_profile_encoding = user_profile_encodings[0]
        captured_encoding = captured_encodings[0]

        # Compare faces
        results = face_recognition.compare_faces([user_profile_encoding], captured_encoding)

        # Return result (match or not)
        return {'match': bool(results[0])}

    except Exception as e:
        error_message = f"Error performing face recognition: {e}"
        logging.error(error_message)
        return {'error': error_message}


@app.route('/perform-face-recognition', methods=['POST'])
def handle_face_recognition():
    try:
        data = request.json
        user_profile_image_path = data['user_profile_image_path']
        captured_image_path = data['captured_image_path']

        result = perform_face_recognition(user_profile_image_path, captured_image_path)
        return jsonify(result)

    except Exception as e:
        error_message = f"Error processing request: {e}"
        logging.error(error_message)
        return jsonify({'error': error_message}), 500

if __name__ == "__main__":
    app.run(debug=True)
