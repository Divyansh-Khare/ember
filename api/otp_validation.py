# code to generate and send otp to the email address
from django.core.mail import send_mail
from django.conf import settings
import secrets

def send_otp(email):
    ran_otp = secrets.randbelow(900000) + 100000
    if (email):
        try:
            send_mail(subject='EMBER Account Verification', message=f'OTP : {ran_otp}. This OTP is valid for 10 minutes only.', from_email=None, recipient_list=[email])
            return ran_otp
        except:
            return "error"