from flask import Flask, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_cors import CORS
from models import db, Users
from auth import auth_bp
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS with credentials support for frontend
CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

# Initialize the database and JWT manager
db.init_app(app)
jwt = JWTManager(app)

# Registers the auth blueprint from auth.py
# Blueprint is a way to organize routes into separate files
app.register_blueprint(auth_bp, url_prefix="/auth")

# Dont know what is does, but creates the tables in the db before the first request
with app.app_context():
    db.drop_all()
    db.create_all()


# Profile route that the frontend can access to validate login state
# JWT required decorator to ensure the validity of the JWT token
@app.route("/profile")
@jwt_required(locations=["cookies"])
def profile():
    user_id = get_jwt_identity()
    user = Users.query.get(user_id)
    return jsonify({"email": user.email})

if __name__ == "__main__":
    app.run(debug=True)
