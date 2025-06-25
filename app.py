# app.py (Версія 3.1 - Повна і виправлена)

import os
import re
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

# --- Ініціалізація ---
load_dotenv()
app = Flask(__name__)
CORS(app) 
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash-latest')

# --- Допоміжні функції ---

def extract_video_id(video_url):
    """Витягує ID відео з різних форматів посилань."""
    patterns = [
        r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)',
        r'(?:https?:\/\/)?youtu\.be\/([^?&]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, video_url)
        if match:
            return match.group(1)
    return None

def get_transcript_text(video_id):
    """Отримує текст субтитрів як один рядок."""
    try:
        # Пріоритет мов: українська, англійська.
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['uk', 'en'])
        full_text = " ".join([d['text'] for d in transcript_list])
        return full_text
    except (TranscriptsDisabled, NoTranscriptFound):
        return None

# --- Основний маршрут API ---

@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json()
    if not data or 'video_url' not in data:
        return jsonify({"error": "Необхідно передати 'video_url'"}), 400

    video_url = data['video_url']
    target_language = data.get('language', 'українською')
    summary_length = data.get('summary_length', 'короткий') 

    try:
        video_id = extract_video_id(video_url)
        if not video_id:
            return jsonify({"error": "Некоректне посилання на YouTube відео"}), 400

        subtitles_text = get_transcript_text(video_id)
        if not subtitles_text:
            return jsonify({"error": "Субтитри для цього відео не знайдено або вимкнено."}), 404

        prompt = f"""
        Зроби {summary_length} за обсягом, структурований підсумок (summary) наступного тексту з субтитрів YouTube відео.
        Якщо довжина "короткий", зроби 2-3 речення.
        Якщо довжина "середній", зроби 4-6 речень з основними тезами.
        Якщо довжина "детальний", зроби розгорнутий підсумок у вигляді списку з ключовими ідеями.
        Відповідь надай {target_language}.
        Текст: "{subtitles_text}"
        """
        
        response = model.generate_content(prompt)
        return jsonify({"summary": response.text})
        
    except Exception as e:
        print(f"Сталася непередбачувана помилка: {e}")
        return jsonify({"error": "Сталася помилка на сервері."}), 500

if __name__ == '__main__':
     if __name__ == '__main__': app.run()