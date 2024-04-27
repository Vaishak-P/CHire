from flask import Flask, request, jsonify,render_template
import spacy
import speech_recognition as sr
import textstat
import pronouncing
import jellyfish
from pyaspeller import YandexSpeller

app = Flask(__name__)

nlp = spacy.load("en_core_web_sm")

@app.route('/')
def index():
    return render_template('fluency.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if request.method == 'POST':
        transcript = request.json.get('text', '')
        if transcript.strip():
            errors, error_locations = analyze_text(transcript)
            speech_rate_in_100 = textstat.flesch_reading_ease(transcript)
            repetition_rate = calculate_repetition_rate(transcript)
            word_frequency = calculate_word_frequency(transcript)
            word_frequency_score = calculate_word_frequency_score(word_frequency)
            pronunciation_score = calculate_pronunciation_score(transcript)
            fluency_score = calculate_overall_score(speech_rate_in_100, word_frequency_score, pronunciation_score) / 3

            return jsonify({
                'text': transcript,
                'errors': errors,
                'error_locations': error_locations,
                'speech_rate': speech_rate_in_100,
                'repetition_rate': repetition_rate,
                'word_frequency': word_frequency,
                'word_frequency_score': word_frequency_score,
                'pronunciation_score': pronunciation_score,
                'fluency_score': fluency_score
            })
        else:
            return jsonify({'error': 'Failed to recognize speech'})

def analyze_text(text):
    doc = nlp(text)
    errors = []
    error_locations = []

    # Define a list to store tuples of (error_message, error_location)
    error_locations = []

    # Rule 1: Subject-Verb Agreement Errors
    for token in doc:
        if token.dep_ == "nsubj" and token.head.pos_ == "VERB":
            subject = token.text.lower()
            verb = token.head.text.lower()
            if verb.endswith('s') and not subject.endswith('s'):
                error_message = f"Subject-verb agreement error detected: '{subject}' and '{verb}' do not agree in number."
                errors.append(error_message)
                error_location = (token.idx, token.idx + len(token.text))
                error_locations.append(error_location)

    # Rule 2: Verb Tense Errors
    for token in doc:
        if token.tag_.startswith("V") and token.lemma_ != token.text:
            error_message = f"Verb tense error detected: '{token.text}' should be '{token.lemma_}'."
            errors.append(error_message)
            error_location = (token.idx, token.idx + len(token.text))
            error_locations.append(error_location)

    # Rule 3: Pronoun-Antecedent Agreement Errors
    for token in doc:
        if token.tag_ == "PRP" and token.head.pos_ == "NOUN":
            antecedent = [ancestor.text for ancestor in token.head.ancestors if ancestor.pos_ == "NOUN"]
            if antecedent and token.text.lower() not in antecedent[0].lower():
                error_message = f"Pronoun-antecedent agreement error detected: '{token.text}' does not agree with its antecedent '{antecedent[0]}'."
                errors.append(error_message)
                error_location = (token.idx, token.idx + len(token.text))
                error_locations.append(error_location)

    # Rule 4: Sentence Fragment Errors
    for sent in doc.sents:
        if len(list(sent)) <= 2 and sent.text.strip()[-1] != '.':
            error_message = "Sentence fragment detected: This sentence seems to be incomplete."
            errors.append(error_message)
            error_location = (sent.start_char, sent.end_char)
            error_locations.append(error_location)

    # Rule 5: Run-On Sentences
    for i in range(len(doc) - 1):
        if doc[i].is_sent_start and doc[i + 1].is_sent_start:
            error_message = "Run-on sentence detected: There may be missing punctuation or conjunctions between these sentences."
            errors.append(error_message)
            error_location = (doc[i].idx, doc[i + 1].idx)
            error_locations.append(error_location)

    return errors, error_locations

def calculate_repetition_rate(text):
    words = text.split()
    word_count = len(words)
    unique_words = set(words)
    repetition_rate = 1 - (len(unique_words) / word_count)
    return repetition_rate

def calculate_word_frequency(text):
    words = text.split()
    word_frequency = {}
    for word in words:
        word_frequency[word] = word_frequency.get(word, 0) + 1
    return word_frequency

def calculate_word_frequency_score(word_frequency):
    total_words = sum(word_frequency.values())
    unique_words = len(word_frequency)
    score = 100 * (unique_words / total_words)
    return min(score, 100) 

def calculate_pronunciation_score(text):
    speller = YandexSpeller()
    fixed_text = speller.spelled(text)
    if fixed_text != text:  # Check if any corrections were made
        print("Spelling errors corrected:", fixed_text)
        text = fixed_text
    
    total_similarity_score = 0
    word_count = 0
    words = text.split()
    max_similarity_score = 0  # Initialize max_similarity_score
    for word in words:
        pronunciations = pronouncing.phones_for_word(word)
        if pronunciations:
            recognized_pronunciation = pronunciations[0]
            correct_pronunciations = pronouncing.phones_for_word(word)
            for correct_pronunciation in correct_pronunciations:
                similarity_score = jellyfish.levenshtein_distance(recognized_pronunciation, correct_pronunciation)
                max_similarity_score = max(max_similarity_score, similarity_score)
            
            total_similarity_score += max_similarity_score
            word_count += 1

    if word_count > 0 and max_similarity_score > 0:  # Check for non-zero max_similarity_score
        average_similarity_score = total_similarity_score / word_count
        total_pronunciation_score_in_100 = (average_similarity_score / max_similarity_score) * 100
        return total_pronunciation_score_in_100
    else:
        return None

def calculate_overall_score(fluency_score, word_frequency_score, pronunciation_score):
    if fluency_score is None or word_frequency_score is None or pronunciation_score is None:
        return None
    return fluency_score + word_frequency_score + pronunciation_score

if __name__ == "__main__":
    app.run(debug=True)
