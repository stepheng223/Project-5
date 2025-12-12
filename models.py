from django.db import models

class Game(models.Model):
    name = models.CharField(max_length=100, blank=True, null=True)
    grid = models.JSONField()
    solution_words = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or f"Game {self.id}"


class Leaderboard(models.Model):
    player_name = models.CharField(max_length=100)
    score = models.IntegerField()
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="scores")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.player_name} - {self.score}"
