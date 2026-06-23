from flask import Flask, render_template
from igdb_caching import get_create_game

app = Flask(__name__)


def game(game_id):
    game = get_create_game(game_id)
    return render_template('game.html', game=game)

if __name__ == '__main__':
    app.run(debug=True)