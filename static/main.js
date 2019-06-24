var app = new Vue({
  el: '#app',
  data: {
    ai_players: [],
    selected_ai: '',
    ai_info: [],
    dice_number: 5,
    dice_face: [1,2,3,4,5],
    just_rolled: [1,0,0,0,0],
    current_game_init: {
      rolled: [],
      reroll_index: []
    },
    one_ai_table_header: [
      { text: 'Game', value: 'game_num', align: 'center', sortable: false },
      { text: 'Points', value: 'points', align: 'center', sortable: false },
    ],
    games_to_play: 5,
    show_result_summary: false,
  },
  computed: {
    current_ai: function () {
      let c_ai = this.ai_info.find(x => x.module == this.selected_ai);
      return c_ai ? c_ai : { name: '', module: this.selected_ai, icon: '', members: [], games: [] }
    },
    messages: function () {
      let m = [];
      this.current_game.rolled.forEach((v, i) => {
        m.push("rolled dice: " + v.join(', '));
        if (this.current_game.reroll_index[i]) {
          m.push("to reroll: " + this.current_game.reroll_index[i].join(', '));
        }
      });
      return m;
    },
    current_game: function () {
      return this.current_ai.games[this.current_ai.games.length - 1] || JSON.parse(JSON.stringify(this.current_game_init));
    },
    can_game_continue: function () {
      return this.current_game.rolled.length < 6 & (this.current_game.reroll_index.length > 0 ?  this.current_game.reroll_index[this.current_game.reroll_index.length - 1].length > 0 : true);
    },
    one_ai_table_items: function () {
      return this.current_ai.games.map((x, i) => ({
        game_num: i+1,
        points: this.getPoints(x.rolled[x.rolled.length - 1]),
        details: x
      }));
    },
    result_summary_header: function () {
      let max_game_num = this.ai_info.reduce((acc,x) => {
        let game_num = x.games.length;
        if (game_num > acc) acc = game_num;
        return acc
      }, 0);
      let h = [...Array(max_game_num).keys()].map(x => ({ text: `Game ${x+1}`, value: `${x}`, align: 'center' }));
      h.splice(0,0,{ text: 'Player', value: 'player' });
      h.push({ text: 'Total', value: 'total', align: 'center' });
      return h;
    },
    result_summary_items: function () {
      return this.ai_info.map(x => ({
        name: x.name,
        games: [...Array(this.result_summary_header.length-2).keys()].map(i => x.games[i] ? this.getPoints(x.games[i].rolled[x.games[i].rolled.length - 1]) : 0)
      }));
    }
  },
  mounted: function () {
    this.getAiList()
      .then(r => {
        this.selected_ai = this.ai_players[0];
        return r;
      })
      .then(this.initAllAiPlayers)
      .then(r => {
        this.ai_info = [];
        this.ai_info.push(...r);
        return r;
      })
      .then(console.log);
  },
  methods: {
    getAiList: function() {
      const request = new Request('./get-ai-players');
      return fetch(request)
      .then(r => r.json())
      .then(r => {
        this.ai_players = r;
        return r;
      });
    },
    initAiPlayer: function (ai_name) {
      const request = new Request(`./init-ai-player/${ai_name}`);
      return fetch(request)
        .then(r => {
          return r.json()
        })
        .then(r => {
          if (r.error) {
            console.error(r.error_msg);
            return Promise.reject(r.error_msg);
          } else {
            console.log(r.msg);
            return Promise.resolve(r);
          }
        });
    },
    initAllAiPlayers: function () {
      return Promise.all(this.ai_players.map(x => this.initAiPlayer(x).then(r => ({
        name: r.group_name,
        module: x,
        icon: r.group_icon,
        members: r.group_members,
        games: [JSON.parse(JSON.stringify(this.current_game_init))]
      }))));
    },
    rollDice: function (dice_index) {
      for (let i = 0; i < dice_index.length; i++) {
        let rolled = Math.max(1, Math.ceil(Math.random()*6));
        this.$set(this.dice_face, dice_index[i], rolled);
      }
      this.current_ai.games[this.current_ai.games.length - 1].rolled.push(JSON.parse(JSON.stringify(this.dice_face)));
    },
    newGame: function() {
      if (JSON.stringify(this.current_ai.games[this.current_ai.games.length - 1]) !== JSON.stringify(this.current_game_init)) {
        this.current_ai.games.push(JSON.parse(JSON.stringify(this.current_game_init)));
      }
    },
    requestNextReroll: function () {
      console.log(this.current_ai.module, this.dice_face);
      const request = new Request(`./call-ai-player/${this.current_ai.module}/${this.dice_face.join(',')}/${6 - this.current_game.rolled.length}`);
      return fetch(request)
        .then(r => {
          return r.json()
        })
        .then(r => {
          if (r.error) {
            console.error(r.error_msg);
            return Promise.reject(r.error_msg);
          } else {
            this.current_game.reroll_index.push(r.reroll_dice)
            return Promise.resolve(r.reroll_dice);
          }
        });
    },
    rollOnce: function () {
      if (this.current_game.reroll_index.length > 0) {
        this.rollDice(this.current_game.reroll_index[this.current_game.reroll_index.length - 1]);
      } else {
        this.rollDice([...Array(this.dice_number).keys()]);
      }
      if (this.can_game_continue) return this.requestNextReroll().then(() => true);
      else return Promise.resolve(false);
    },
    runAGame: function () {
      let rag = () => this.rollOnce()
        .then(r => {
          if (r) {
            return rag();
          } else {
            Promise.resolve();
          }
        });
      return rag();
    },
    runAll: function () {
      let selected_ai_idx = 0;
      this.selected_ai = this.ai_players[selected_ai_idx];
      let ra = () => this.runAGame()
        .then(r => {
          console.log(this.current_ai.games.length, selected_ai_idx);
          if (this.current_ai.games.length < this.games_to_play) { this.newGame(); return ra(); }
          else if (selected_ai_idx < this.ai_players.length - 1) { selected_ai_idx += 1; this.selected_ai = this.ai_players[selected_ai_idx]; return ra(); }
          else Promise.resolve();
        });
      return ra();
    },
    formatDetails: function (details) {
      let m = [];
      details.rolled.forEach((v, i) => {
        m.push({ label: 'rolled', value: v.join(', ') });
        if (details.reroll_index[i]) {
          m.push({ label: 'reroll', value: details.reroll_index[i].join(', ') });
        }
      });
      return m;
    },
    getPoints: function (dice_face) {
      let points = dice_face ? dice_face.reduce((acc, v) => acc + v, 0) : 0;
      if (points !== 0) {
        let freq = Array(6);
        freq.fill(0);
        dice_face.forEach(x => {
          freq[x-1] += 1;
        });
        if (freq.indexOf(5) !== -1) { points += 70; } //five in a row
        else if (freq.indexOf(4) !== -1) { points += 40; } //four + one
        else if (freq.indexOf(3) !== -1) { points += (freq.indexOf(2) !== -1) ? 50 : 30; } //three + two or three + one + one
        else {
          let sorted_df = dice_face.slice(0);
          sorted_df.sort();
          if (sorted_df.reduce((acc,val,idx,arr) => { if (idx > 0) { acc.push(val - arr[idx-1]); } return acc; }, []).every(el => el == 1)) { points += 60; } // straights
        }
      }
      return points;
    },
    saveGames: function () {
      let req = new Request("./save-game-result", {
        method: 'POST',
        body: JSON.stringify(this.ai_info)
      });
      
      fetch(req)
        .then(r => {
          if (r.status == 200) return r.json();
          else throw new Error("Error saving game result") 
        })
        .then(console.log);
    },
    loadGames: function () {
      let req = new Request("./load-game-result");
      fetch(req)
        .then(r => {
          if (r.status == 200) return r.json();
          else throw new Error("Error loading game result")
        })
        .then(r => {
          r.forEach(x => {
            let thisai = this.ai_info.find(y => x.name == y.name && x.module == y.module && x.icon == y.icon);
            if (thisai) thisai.games = x.games.slice(0);
          });
          console.log(r);
        })
    }
  }
});