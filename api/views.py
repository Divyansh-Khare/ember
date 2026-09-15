from django.shortcuts import render
from user.models import User
from django.http import JsonResponse, HttpResponse
from . import otp_validation
import json
from user.models import Otp
from django.utils import timezone
from datetime import timedelta

# Create your views here.
def send_otp(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        Otp.objects.filter(expires_at__lt=timezone.now()).delete()
        # check if email already registered or not
        try:
            # email not unique
            User.objects.get(email = email)
            return JsonResponse({'success': False, 'msg':'User already registered with this email address'})
        except:
            # check if email already present in Otp table
            try:
                # email not unique in Otp table
                otp_obj = Otp.objects.get(email=email)
                otp_obj.otp = otp_validation.send_otp(email)
                otp_obj.expires_at = timezone.now() + timedelta(minutes=10)
                otp_obj.attempts = 0
            except:
                # email unique in Otp table
                try:
                    # create new otp object
                    generated_otp = otp_validation.send_otp(email)
                    if (generated_otp != "error"):
                        # store otp and email address and expires_at in the database
                        expires_at = timezone.now() + timedelta(minutes = 10)
                        Otp(email = email, otp = generated_otp, expires_at = expires_at).save()
                        return JsonResponse({'success': True, 'msg': 'OTP sent successfully'})
                    else:
                        return JsonResponse({'success': False, 'msg': "Error sending OTP."})
                except:
                    return JsonResponse({'success': False, 'msg': 'Error in sending OTP'})

def verify_otp(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get('email')
        otp = int(data.get('otp'))

        try:
            otp_obj = Otp.objects.get(email=email, otp=otp)
            if (timezone.now() > otp_obj.expires_at):
                otp_obj.delete()
                return JsonResponse({'success': False, 'msg': 'OTP expired.'})
            else:
                otp_obj.delete()
                return JsonResponse({'success': True, 'msg': 'OTP verified.'})
        except:
            return JsonResponse({'success': False, 'msg': 'OTP is incorrect.'})

def resend_otp(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get('email')
        try:
            generated_otp = otp_validation.send_otp(email)
            if (generated_otp != "error"):
                Otp.objects.get(email=email).otp = generated_otp
                return JsonResponse({'success': True, 'msg': 'OTP send successfully'})
            else:
                return JsonResponse({'success': False, 'msg': 'Error sending OTP.'})
        except Otp.DoesNotExist:
            return JsonResponse({"success": False, "msg": "Email does not exist"})