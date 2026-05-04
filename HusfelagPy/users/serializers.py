from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    terms_accepted = serializers.SerializerMethodField()

    def get_terms_accepted(self, obj):
        return hasattr(obj, 'terms_acceptance')

    class Meta:
        model = User
        fields = ["id", "kennitala", "name", "email", "phone", "is_superadmin", "terms_accepted"]


class LoginRequestSerializer(serializers.Serializer):
    personID = serializers.CharField(required=False, default="")
    phone = serializers.CharField(required=False, default="")
