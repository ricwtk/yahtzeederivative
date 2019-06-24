from flask import Flask, request
from flask import json as fjson
import os, importlib
import json
import time

app = Flask(__name__)

players = {}
# result_dir = os.path.join("static", "results")
result_json = os.path.join("static", "results.json")

@app.route("/")
def showFrontend():
  return app.send_static_file('frontend.html')

@app.route("/get-ai-players")
def getAiPlayers():
  return fjson.jsonify(os.listdir("player"))

@app.route("/init-ai-player/<ai_name>")
def initAiPlayer(ai_name):
  players.pop(ai_name, None)
  try:
    mod = importlib.import_module("player.{}.player".format(ai_name))
    players[ai_name] = getattr(mod, 'Player')()    
  except:
    return fjson.jsonify({
      "error": True,
      "error_msg": "{} is not available".format(ai_name)
    })
  else:
    # get group information
    with open("./player/{}/group members.txt".format(ai_name)) as f:
      found_group_member = False
      group_members = []
      for line in f:
        stripped = line.strip()
        if found_group_member and stripped:
          group_members.append(stripped)
        if stripped.lower().startswith("group name"):
          group_name = stripped.split(":")[1].strip()
        elif stripped.lower().startswith("group icon"):
          group_icon = stripped.split(":")[1].strip()
        elif stripped.lower().startswith("group members"):
          found_group_member = True
      # json.dump([], open(os.path.join(result_dir, "players", f"{ai_name}.json"), 'w'))
    return fjson.jsonify({
      "error": False,
      "msg": "{} is initiated".format(ai_name),
      "group_name": group_name,
      "group_icon": group_icon,
      "group_members": group_members
    })

@app.route("/call-ai-player/<ai_name>/<dice_face>/<n_rerolls>")
def callAiPlayer(ai_name, dice_face, n_rerolls):
  dice_face = [int(x) for x in dice_face.split(',')]
  if ai_name in players.keys():
    return fjson.jsonify({
      "error": False,
      "dice_face": dice_face,
      "n_rerolls": n_rerolls,
      "reroll_dice": players[ai_name].play(dice_face[:], int(n_rerolls))
    })
  else:
    return fjson.jsonify({
      "error": True,
      "error_msg": "{} is not initiated"
    })

@app.route("/get-init-ai-players")
def getInitAiPlayers():
  return fjson.jsonify(list(players.keys()))

@app.route("/save-game-result", methods=['POST'])
def saveGameResult():
  game_result = json.loads(request.data)
  json.dump(game_result, open(result_json, 'w'))
  return fjson.jsonify("success")

@app.route("/load-game-result")
def loadGameResult():
  game_result = []
  if os.path.isfile(result_json):
    game_result = json.load(open(result_json, 'r'))
  return fjson.jsonify(game_result)

