from django.db import models

# Create your models here.
class Otp(models.Model):
    email = models.EmailField()
    otp = models.IntegerField()
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)

    def __str__(self):
        return f'{self.email} | {self.otp}'

class User(models.Model):
    email = models.EmailField()
    pwd = models.CharField()
    full_name = models.CharField()
    phone = models.CharField()
    gov_id_type = models.CharField()
    id_no = models.CharField()
    role_id = models.CharField()

    def __str__(self):
        return f'{self.full_name} | {self.email} | {self.pwd}'

