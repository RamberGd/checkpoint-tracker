
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.fields.simple import EmailField
from wtforms.validators import InputRequired, Length, ValidationError
from backend.models import User

class Signup(FlaskForm):
    """
    Registration form for creating new user accounts.

    The form collects:
    -email
    -password
    -username
    -password confirmation

    Validation ensures that the email and username is unique to each user.
    """
    username = StringField(validators=[InputRequired(message="All fields are required"), Length(min=2, max=20)], render_kw={"placeholder": "Username"})
    email = EmailField(validators=[InputRequired(message="All fields are required"), Length(min=2, max=120)],render_kw={"placeholder": "E-mail"})
    password = PasswordField(validators=[InputRequired(message="All fields are required"), Length(min=8, max=128, message="Password must be at least 8 characters")],
                           render_kw={"placeholder": "Password"})
    confirm = PasswordField(validators=[InputRequired(message="All fields are required"), Length(min=8, max=128, message="Password must be at least 8 characters")], render_kw={"placeholder": "Confirm Password"})


    def validate_confirm(self, confirm)-> None:
        """
        Validate that the password and the confirmation match.

        Args:
            confirm: the field for password confirmation

        Raises:
            ValidationError: if the passwords do not match
        """

        if confirm.data != self.password.data:
            raise ValidationError("Passwords do not match")
    submit = SubmitField("Sign Up")

    def validate_username(self, username)-> None:
        """
         Validate that the chosen username is unique

         Args:
             username: the username field being validated

         Raises:
             ValidationError: if the username has already been taken
         """

        existing_username = User.query.filter_by(username=username.data).first()
        if existing_username:
            raise ValidationError("A user with this username already exists")

    def validate_email(self, email) -> None:
        """
        Validate that the chosen email is unique

        Args:
            email: the email field being validated

        Raises:
            ValidationError: if the email has already been taken
         """
        existing_email = User.query.filter_by(email=email.data).first()
        if existing_email:
            raise ValidationError("A user with this email already exists")

class LoginForm(FlaskForm):
    """
       Log in form for existing users.

       The form collects:
       -email OR username
       -password

    """
    username_or_email = StringField(
        validators=[InputRequired(), Length(min=2, max=120)],
        render_kw={"placeholder": "Log in via Username or E-mail"}
    )
    password = PasswordField(validators=[InputRequired(), Length(min=8, max=128)],
                           render_kw={"placeholder": "Password"})

    submit = SubmitField("Log in")
