from flask import current_app
from flask_mail import Message


def send_email(to, subject, template, **kwargs):
    msg = Message(subject, recipients=[to], html=template, **kwargs)
    current_app.extensions["mail"].send(msg)