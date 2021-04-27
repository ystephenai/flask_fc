from flask import Flask, request, render_template, abort, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
import os
import click
import face_recognition
import base64
import pickle
from io import BytesIO
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, current_user, login_user, logout_user, login_required
from werkzeug.contrib.fixers import ProxyFix
import json

# face_recognition
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def detect_faces_in_image(file_stream,  known_face_encoding):
    img = face_recognition.load_image_file(file_stream)
    unknown_face_encodings = face_recognition.face_encodings(img)
    face_match = False
    if len(unknown_face_encodings) > 0:
        match_results = face_recognition.compare_faces([known_face_encoding], unknown_face_encodings[0])
        if match_results[0]:
            face_match = True
    return face_match

def encoding_face(file_stream):
    img = face_recognition.load_image_file(file_stream)
    return face_recognition.face_encodings(img)

def base64converter(photo):
    starter = photo.find(',')
    image_data = photo[starter + 1:]
    image_data = bytes(image_data, encoding="ascii")
    return BytesIO(base64.b64decode(image_data))

# database
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///" + os.path.join(app.root_path, 'data.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = "_5#y2LF4Q8z\n\xec]/"
app.wsgi_app = ProxyFix(app.wsgi_app)
db = SQLAlchemy(app)

# login manager
login_manager = LoginManager()
login_manager.init_app(app)

class User(db.Model,UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(80),nullable=False)
    email = db.Column(db.String(80), nullable=False)
    face_encoding = db.Column(db.Text, nullable=False)
    stocks = db.Column(db.Text)

@app.cli.command()
def initdb():
    # flask initdb
    db.drop_all()
    db.create_all()
    click.echo("Initialized database")


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/detail')
def detail():
    stock = request.args.get('stock')
    return render_template('detail.html', stock=stock)


@app.route("/login", methods= ['GET',"POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('/index'))
    else:
        if request.method == "POST":
            username = request.form.get("username")
            password = request.form.get("password")
            photo = base64converter(request.form.get("photo"))

            user = User.query.filter_by(username=username).first()
            if user:
                if check_password_hash(user.password, password) and detect_faces_in_image(photo, pickle.loads(user.face_encoding)):
                    login_user(user)
                    return jsonify(message="success")
                return jsonify(message="login failed"), 403
            else:
                return jsonify(message="no account"), 403
        else:
            return render_template('login.html')


@app.route("/signup", methods= ['GET',"POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        password = generate_password_hash(request.form.get("password"))
        email = request.form.get("email")
        photo = base64converter(request.form.get("photo"))
        face_encodings = encoding_face(photo)
        if not face_encodings:
            return jsonify(message="register failed"),403
        else:
            face_encoding=pickle.dumps(face_encodings[0])
        user = User(username=username, password=password, email=email, face_encoding=face_encoding)
        db.session.add(user)
        db.session.commit()
        return jsonify(message="register success")
    else:
        return render_template('signup.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for("/"))


if __name__ == '__main__':
    app.run()
