from flask import Flask, request, jsonify
import os
import torch
import fasttext
import logging
from huggingface_hub import hf_hub_download
from transformers import pipeline, AutoTokenizer
from flask_cors import CORS
from pdfminer.high_level import extract_text as extract_pdf_text
import docx
from werkzeug.utils import secure_filename
# from flask_uploads import UploadSet, configure_uploads



app = Flask(__name__)

logger = logging.getLogger('werkzeug')
UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

try:
    model_path = hf_hub_download(repo_id="facebook/fasttext-language-identification", filename="model.bin")
    lang_model = fasttext.load_model(model_path)
    device = 0 if torch.cuda.is_available() else -1
    general_hate_speech_model = pipeline("text-classification", model="facebook/roberta-hate-speech-dynabench-r4-target", device=device)
    tokenizer = AutoTokenizer.from_pretrained('./saved_model/', local_files_only=True)
    saved_model = torch.load('./saved_model/model')
    models = {
        'hin_Deva': pipeline("text-classification", model="arnabmukhopadhyay/Roberta-hindi-hate-speech"),
        'ben_Beng': pipeline("text-classification", model="Jayveersinh-Raj/bengali_hatespeech_extension", device=0),
        'tam_Taml': pipeline("text-classification", model="Hate-speech-CNERG/deoffxlmr-mono-tamil")
    }
except Exception as e:
    print(f"Error loading models: {str(e)}")
    lang_model = None
    general_hate_speech_model = None
    models={}

def get_model_for_language(language):
    if language in models:
        logger.info("model selected for "+language)
        return models[language]
    else:
        logger.info("model selected for english")
        return pipeline(
            task='text-classification',
            model=saved_model,
            tokenizer=tokenizer,
            device=torch.cuda.current_device() if torch.cuda.is_available() else -1,
            top_k=1
        )

def classify_text(text):
    if not text.strip():
        return {"error": "Empty text provided"}
    binary_label=None
    try:
        lines = text.splitlines()
        clean_text = " ".join([line.strip() for line in lines if line.strip()])
        logger.info(clean_text)
        lang_pred = lang_model.predict(clean_text)
        detected_lang = lang_pred[0][0].replace("__label__", "")
        logger.info(detected_lang)
        model_pipeline = get_model_for_language(detected_lang)

        if detected_lang == "eng_Latn":
            logger.info("English language detected")
            binary_result = general_hate_speech_model(clean_text)
            binary_label = binary_result[0]['label']
            binary_confidence = binary_result[0]['score']
            if binary_label == "nohate":
                logger.info(binary_label)
                return {
                    "binary_label": binary_label,
                    "binary_confidence": binary_confidence,
                }
            else:
                predictions = model_pipeline(clean_text)
                prediction = predictions[0]

                return {
                    "binary_label": binary_label,
                    "binary_confidence": binary_confidence,
                    "detailed_label": prediction[0]['label'],
                    "confidence": prediction[0]['score']
                }
        elif detected_lang in models:
            predictions = model_pipeline(clean_text)
            return predictions
        else:
            return {"error": "Language not supported"}

    except Exception as e:
        return {"error": f"Error during text classification: {str(e)}"}

def extract_text(file_path):
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.pdf':
            return extract_pdf_text(file_path)
        if ext == '.docx':
            return '\n'.join(p.text for p in docx.Document(file_path).paragraphs)
        if ext == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        return ""

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        result = classify_text(data['text'])
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload():
    try:
        logger.info("Uploading files")
        # Log the entire request for debugging
        logger.info(f"Content-Type: {request.content_type}")
        logger.info(f"Files in request: {request.files.keys()}")
        
        if 'files[]' not in request.files and 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400
            
        files_to_process = request.files.getlist('files[]') or [request.files['file']]
        file_paths = []
        
        for file in files_to_process:
            if file.filename == '':
                continue
                
            filename = secure_filename(file.filename)
            logger.info(f"Processing file: {filename}")
            
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            file_paths.append(file_path)
            logger.info(f"Saved file to: {file_path}")
        
        if not file_paths:
            return jsonify({"error": "No valid files uploaded"}), 400
            
        text = ""
        for file_path in file_paths:
            extracted_text = extract_text(file_path)
            logger.info(f"Extracted text from {file_path}: {extracted_text[:100]}...")  # Log first 100 chars
            text += extracted_text + "\n"
            
            # Clean up the file after processing
            try:
                os.remove(file_path)
                logger.info(f"Cleaned up file: {file_path}")
            except Exception as e:
                logger.error(f"Error cleaning up file {file_path}: {str(e)}")
        text = classify_text(text)
        return jsonify({'text': text}), 200

    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
