from flask import Flask, request
from flask import json as fjson
import os, importlib
import json
import time

app = Flask(__name__)

players = {}
result_dir = os.path.join("static", "results")
players_json = os.path.join(result_dir, "players.json")

@app.route("/")
def showFrontend():
  return app.send_static_file('frontend.html')

@app.route("/get-ai-players")
def getAiPlayers():
  return fjson.jsonify(os.listdir("player"))

@app.route("/init-ai-player/<ai_name>")
def initAiPlayer(ai_name):
  # players.pop(ai_name, None)
  if ai_name in players.keys():
    return fjson.jsonify({
      "error": True,
      "error_msg": f"{ai_name} was initiated previously"
    })
  else:
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

# @app.route("/save-game-result", methods=['POST'])
# def saveGameResult():
#   game_result = json.loads(request.data)
#   firstplayer_json = os.path.join(result_dir, "players", "{}.json".format(game_result["play"][0]["module"]))
#   # print(json.dumps(game_result, indent=2))

#   # check if json file exists
#   players = json.load(open(players_json, 'r')) if os.path.isfile(players_json) else {}
#   for i in range(len(game_result['play'])):
#     if not game_result['play'][i]['module'] in players:
#       # save player detail to players.json if not present
#       players[game_result['play'][i]['module']] = game_result['play'][i]
#   # save to players_json
#   json.dump(players, open(players_json, 'w'))
#   # save move
#   # check if json file exists
#   firstplayer = json.load(open(firstplayer_json, 'r')) if os.path.isfile(firstplayer_json) else []
#   # replace the game result if existed
#   second_players = [g['second_player'] for g in firstplayer]
#   game_play = {
#     'second_player': game_result['play'][1]['module'],
#     'moves': game_result['moves'],
#     'result': game_result['result']
#   }
#   if game_result['play'][1]['module'] in second_players:
#     firstplayer[second_players.index(game_result['play'][1]['module'])] = game_play
#   else: # add the game result
#     firstplayer.append(game_play)
#   # save to firstplayer_json
#   json.dump(firstplayer, open(firstplayer_json, 'w'))
#   return fjson.jsonify("success")


