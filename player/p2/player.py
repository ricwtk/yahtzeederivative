import random

class Player:
  def __init__ (self):
    pass
  
  def play (self, dice_face, available_rerolls):
    n_dice = random.choice(range(len(dice_face)+1))
    return random.sample(range(len(dice_face)), n_dice)