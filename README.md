🎓 Student Depression Analyzer

A Full-Stack Machine Learning web application that predicts the likelihood of student depression based on academic, lifestyle, and personal factors.

This project integrates a trained ML model with a Flask backend and an interactive frontend interface.

📌 Project Overview

Student mental health is a growing concern worldwide.
This application analyzes student-related attributes and predicts whether a student is at risk of depression using a trained machine learning model.

The system:

Collects user inputs through a web interface

Sends data to a Flask backend

Processes inputs using a trained ML pipeline

Returns a prediction result instantly

🛠 Tech Stack
🔹 Frontend

HTML5

CSS3

JavaScript

🔹 Backend

Python

Flask

Flask-CORS

🔹 Machine Learning

Scikit-learn

Pandas

NumPy

Joblib

📂 Project Structure
student-drpression-analyser/
│
├── Depression_Student_Dataset.csv
├── model_training.ipynb
├── requirements.txt
│
├── backend/
│   ├── app.py
│   ├── metadata.json
│   ├── model_pipeline.joblib
│
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
⚙️ How It Works

1️⃣ Data Preprocessing

Handles missing values

Encodes categorical variables

Scales numerical features

2️⃣ Model Training

Trained using Scikit-learn pipeline

Saved using joblib

3️⃣ Prediction Flow

User enters data in frontend

JavaScript sends POST request to Flask API

Flask loads trained model

Model returns prediction

Result displayed instantly on UI

🚀 How To Run Locally
1️⃣ Clone the Repository
git clone https://github.com/your-username/student-depression-analyser.git
cd student-depression-analyser
2️⃣ Install Dependencies
pip install -r requirements.txt
3️⃣ Run Backend
cd backend
python app.py
4️⃣ Open Frontend

Open index.html in your browser.

📊 Model Output

The model predicts:

0 → Not Likely Depressed

1 → Likely Depressed

⚠️ This tool is for educational purposes only and should not replace professional medical diagnosis.

🎯 Features

✔ Full ML Pipeline
✔ Model Serialization with Joblib
✔ REST API using Flask
✔ Frontend-Backend Integration
✔ Real-time Prediction

📈 Future Improvements

Deploy on Render / Railway

Add user authentication

Store predictions in database

Improve UI/UX

Add probability score output

👨‍💻 Author

Nithish AK
Computer Science & Engineering (Data Science)
