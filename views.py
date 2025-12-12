from rest_framework import viewsets
from .models import Game, Leaderboard
from .serializers import GameSerializer, LeaderboardSerializer

class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all().order_by('-created_at')
    serializer_class = GameSerializer

class LeaderboardViewSet(viewsets.ModelViewSet):
    queryset = Leaderboard.objects.all().order_by('-score')
    serializer_class = LeaderboardSerializer
