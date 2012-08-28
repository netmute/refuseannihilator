var player,
  gameIntervals = [],
  missilesFired,
  missilesHit,
  enemiesDestroyed,
  enemiesSurvived,
  startTime,
  endTime,
  endGameReason,
  highscores = [],
  population = [],
  currentGeneration = 1,
  currentShipModel = 1,
  shipSizeMap = [null, 12, 9, 5],
  weaponSizeMap = [null, 3, 7, 11, 15],
  bulletSizeMap = [null, 3, 4, 5],
  debrisSizeMap = [null,
    { height: 14, width: 12 },
    { height: 14, width: 7 },
    { height: 14, width: 3 },
    { height: 12, width: 15 },
    { height: 7, width: 15 },
    { height: 7, width: 15 }
  ],
  $generation,
  $shipModel,
  $currentGenome,
  $shootingAccuracy,
  $debrisMissed,
  $timeSurvied,
  $score,
  $highscoresDisplay,
  accuracy = function() {
    if (missilesFired == 0) return 100;
    return Math.round((missilesHit / missilesFired) * 100);
  },
  timeSurvied = function() {
    end = endTime || Date.now();
    return (end - startTime) / 1000;
  },
  genomeString = function(genome) {
    genome = genome || player.genome;
    return (
      player.genome.shipSpeed + '-' +
      player.genome.amountWeapons + '-' +
      player.genome.weaponSpeed + '-' +
      player.genome.projectileSize + '-' +
      player.genome.shipWidth
    );
  };

window.onload = function() {
  $generation = $('#generation');
  $shipModel = $('#shipModel');
  $currentGenome = $('#currentGenome');
  $shootingAccuracy = $('#shootingAccuracy');
  $debrisMissed = $('#debrisMissed');
  $timeSurvied = $('#timeSurvied');
  $score = $('#score');
  $highscoresDisplay = $('#highscores');

  _(6).times(function() {
    population.push(newGenome())
  });

  _(10).times(function() {
    highscores.push({genome: 'X-X-XX-X-X', score: 0});
  });

  printHighscores();

  Crafty.init(600, 480);
  Crafty.canvas.init();

  Crafty.background('#000');
  Crafty.scene('intro');
}

Crafty.audio.add({
  bullet1: ['bullet1.wav', 'bullet1.mp3'],
  bullet2: ['bullet2.wav', 'bullet2.mp3'],
  bullet3: ['bullet3.wav', 'bullet3.mp3'],
  debrishit: ['debrishit.wav', 'debrishit.mp3'],
  nextship: ['nextship.wav', 'nextship.mp3'],
  music: ['music.mp3']
});

Crafty.sprite('globe.png', { Globe: [0, 0] });
Crafty.sprite('howto.png', { Howto: [0, 0] });
Crafty.sprite('intro.png', { Intro: [0, 0] });
Crafty.sprite('new_generation.png', { Transition7: [0, 0] });
Crafty.sprite('ship1.png', { Transition1: [0, 0] });
Crafty.sprite('ship2.png', { Transition2: [0, 0] });
Crafty.sprite('ship3.png', { Transition3: [0, 0] });
Crafty.sprite('ship4.png', { Transition4: [0, 0] });
Crafty.sprite('ship5.png', { Transition5: [0, 0] });
Crafty.sprite('ship6.png', { Transition6: [0, 0] });

Crafty.sprite(16, 'sprites.png', {
  Ship1: [0, 0],
  Ship2: [1, 0],
  Ship3: [2, 0],
  Weapon4: [3, 0],
  Weapon3: [4, 0],
  Weapon2: [5, 0],
  Weapon1: [6, 0],
  Bullet3: [0, 1],
  Bullet2: [1, 1],
  Bullet1: [2, 1],
  Exhaust: [3, 1],
  Debris1: [0, 2],
  Debris2: [1, 2],
  Debris3: [2, 2],
  Debris4: [0, 3],
  Debris5: [1, 3],
  Debris6: [2, 3]
});

Crafty.scene('intro', function() {
  Crafty.e("2D, Canvas, Keyboard, Intro")
    .attr({ y: 0, x: -15, w: 640, h: 480 })
    .crop(0, 0, 640, 480)
    .bind('KeyDown', function() {
      Crafty.scene('howto');
    });
} );

Crafty.scene('howto', function() {
  Crafty.e("2D, Canvas, Keyboard, Howto")
    .attr({ y: 0, x: -15, w: 640, h: 480 })
    .crop(0, 0, 640, 480)
    .bind('KeyDown', function() {
      Crafty.audio.play('music', -1);
      Crafty.scene('game');
    });
} );

Crafty.scene('evolve', function() {
  transitionScreen('Transition7');

  var newPopulation = [],
    sortedPopulation = _.sortBy(population, 'fitness');

  newPopulation.push(offspring(sortedPopulation[5], sortedPopulation[4]));
  newPopulation.push(offspring(sortedPopulation[5], sortedPopulation[3]));
  newPopulation.push(offspring(sortedPopulation[5], sortedPopulation[2]));
  newPopulation.push(offspring(sortedPopulation[4], sortedPopulation[3]));
  newPopulation.push(offspring(sortedPopulation[4], sortedPopulation[2]));
  newPopulation.push(newGenome());

  setTimeout(function() {
    population = newPopulation;
    currentGeneration++;
    currentShipModel = 1;
    Crafty.scene('game');
  }, 1000);
});

Crafty.scene('gameover', function() {
  var playedModel = population[currentShipModel - 1];

  Crafty.audio.play('nextship');
  transitionScreen('Transition' + currentShipModel);

  playedModel.fitness = fitness();

  collectGarbage();
  highscores.push({genome: genomeString(playedModel.genome), score: playedModel.fitness});
  printHighscores();

  setTimeout(function() {
    currentShipModel++
    if (currentShipModel > 6) {
      Crafty.scene('evolve');
    } else {
      Crafty.scene('game');
    }
  }, 1000);
});

Crafty.scene('game', function() {
  missilesFired = 0;
  missilesHit = 0;
  enemiesDestroyed = 0;
  enemiesSurvived = 0;
  startTime = Date.now();
  endTime = undefined;

  player = createPlayer(population[currentShipModel - 1]);
  createGlobe();

  gameIntervals.push(setInterval(function() {
    createEnemy();
    _(6).times(createStar);

    $generation.html(currentGeneration);
    $shipModel.html(currentShipModel + ' / 6');
    $currentGenome.html(genomeString());
    $shootingAccuracy.html(accuracy() + '%')
    $debrisMissed.html(enemiesSurvived);
    $timeSurvied.html(timeSurvied() + ' seconds');

    $score.html(fitness());

    if (enemiesSurvived > 100) {
      endTime = Date.now();
      endGameReason = 'toomuchdebris';
      Crafty.scene('gameover');
    }
  }, 100));
});

function createPlayer(genome) {
  var ship = Crafty.e("Player, 2D, Canvas, Ship" + genome.shipWidth + ", Keyboard, Fourway")
        .attr({ y: Crafty.viewport.height - 130,
                x: Crafty.viewport.width/2,
                w: shipSizeMap[genome.shipWidth],
                h: 12,
                genome: genome })
        .fourway(genome.shipSpeed)
        .crop(0, 0, shipSizeMap[genome.shipWidth], 12)
        .bind('KeyDown', function() {
          if (this.isDown('SPACE')) {
            Crafty.audio.play('bullet' + genome.projectileSize);
            _(genome.amountWeapons).times(function(i) {
              missilesFired++;
              createBullet(((weapon.x + 1) + (i *  4)) - (bulletSizeMap[genome.projectileSize] / 2), weapon.y - (bulletSizeMap[genome.projectileSize] / 2));
            });
          }
        })
        .bind("NewDirection", function(direction){
          if (direction.y > 0) {
            exhaust.attr({w: 0, h: 0});
          } else {
            exhaust.attr({w: 3, h: 4});
          }
        })
        .bind('Moved', function(from){
          if ((this.x < 0) || (this.x > Crafty.viewport.width - this.w) || (this.y < 0) || (this.y > Crafty.viewport.height - this.h)) {
            this.attr({x: from.x, y: from.y});
          }
          exhaust.attr({x: ship.x + Math.round(ship.w / 2 - 1.5), y: ship.y + 11});
          weapon.attr({x: ship.x + Math.round(ship.w / 2 - weaponSizeMap[genome.amountWeapons] / 2), y: ship.y - 3});
        }),
      weapon = Crafty.e("2D, Canvas, Weapon" + genome.amountWeapons)
        .attr({ y: ship.y - 3,
                x: ship.x + Math.round(ship.w / 2 - weaponSizeMap[genome.amountWeapons] / 2),
                w: shipSizeMap[genome.shipWidth],
                h: 12,
                genome: genome })
        .crop(0, 0, weaponSizeMap[genome.amountWeapons], 3),
      exhaust = Crafty.e("2D, Canvas, Exhaust")
        .attr({x: ship.x + Math.round(ship.w / 2 - 1.5), y: ship.y + 11})
        .crop(0, 0, 3, 4);

  return ship;
}

function createGlobe() {
  var globe = Crafty.e("2D, Canvas, Globe, Tween")
    .attr({ y: Crafty.viewport.height - 111,
            x: 0,
            w: 640,
            h: 111,
            movement: setInterval(function() {
              globe.tween({y: globe.y + 7}, 5);
            }, 100)})
    .crop(0, 0, 640, 111)
    .bind('EnterFrame', function() {
      if (this.y > Crafty.viewport.height) {
        this.destroy();
        clearInterval(this.movement);
      }
    });

  gameIntervals.push(globe.movement);
  return globe;
}

function createBullet(x, y) {
  var bullet = Crafty.e("Bullet, 2D, Canvas, Bullet" + player.genome.projectileSize + ", Tween")
    .attr({ y: y,
            x: x,
            w: bulletSizeMap[player.genome.projectileSize],
            h: bulletSizeMap[player.genome.projectileSize],
            movement: setInterval(function() {
              bullet.tween({y: bullet.y - player.genome.weaponSpeed}, 5);
            }, 100)})
    .crop(0, 0, bulletSizeMap[player.genome.projectileSize], bulletSizeMap[player.genome.projectileSize])
    .bind('EnterFrame', function() {
      if (this.y < 0) {
        this.destroy();
        clearInterval(this.movement);
      }
    });

  gameIntervals.push(bullet.movement);
  return bullet;
}

function createEnemy() {
  var speed = Crafty.math.randomInt(6, 20),
    debrisType = Crafty.math.randomInt(1, 6),
    enemy = Crafty.e("Enemy, 2D, Canvas, Tween, Collision, Debris" + debrisType)
    .attr({ y: -debrisSizeMap[debrisType].height,
            x: Crafty.math.randomInt(0, Crafty.viewport.width - debrisSizeMap[debrisType].width),
            w: debrisSizeMap[debrisType].width,
            h: debrisSizeMap[debrisType].height,
            movement: setInterval(function() {
              enemy.tween({y: enemy.y + speed}, 5);
            }, 100) })
    .crop(0, 0, debrisSizeMap[debrisType].width, debrisSizeMap[debrisType].height)
    .onHit('Bullet', function(c) {
      Crafty.audio.play('debrishit');
      var bullet = _.first(c).obj;
      bullet.destroy();
      clearInterval(bullet.movement);
      missilesHit++;
      this.destroy();
      clearInterval(this.movement);
      enemiesDestroyed++;
    })
    .onHit('Player', function() {
      endTime = Date.now();
      endGameReason = 'dead';
      Crafty.scene('gameover');
    })
    .bind('EnterFrame', function() {
      if (this.y > Crafty.viewport.height) {
        this.destroy();
        clearInterval(this.movement);
        enemiesSurvived++;
      }
    });

  gameIntervals.push(enemy.movement);
  return enemy;
}

function createStar() {
  var speed = Crafty.math.randomInt(20, 40),
    star = Crafty.e("2D, Canvas, Color, Tween")
    .attr({ y: -1,
            x: Crafty.math.randomInt(0, Crafty.viewport.width-1),
            w: 1,
            h: 1,
            movement: setInterval(function() {
              star.tween({y: star.y + speed}, 5);
            }, 100) })
    .color('#fff')
    .bind('EnterFrame', function() {
      if (this.y > Crafty.viewport.height) {
        this.destroy();
        clearInterval(this.movement);
      }
    });

  gameIntervals.push(star.movement);
  return star;
}

function collectGarbage() {
  _.each(gameIntervals, function(interval) {
    clearInterval(interval);
  });
  gameIntervals = [];
}

function newGenome() {
  return {
    shipSpeed: Crafty.math.randomInt(1, 10),
    amountWeapons: Crafty.math.randomInt(1, 4),
    weaponSpeed: Crafty.math.randomInt(5, 35),
    projectileSize: Crafty.math.randomInt(1, 3),
    shipWidth: Crafty.math.randomInt(1, 3)
  }
}

function fitness() {
  return Math.round(enemiesDestroyed * accuracy() * timeSurvied());
}

function offspring(first, second) {
  return {
    shipSpeed: (Crafty.math.randomInt(0, 1) == 0) ? first.shipSpeed : second.shipSpeed,
    amountWeapons: (Crafty.math.randomInt(0, 1) == 0) ? first.amountWeapons : second.amountWeapons,
    weaponSpeed: (Crafty.math.randomInt(0, 1) == 0) ? first.weaponSpeed: second.weaponSpeed,
    projectileSize: (Crafty.math.randomInt(0, 1) == 0) ? first.projectileSize : second.projectileSize,
    shipWidth: (Crafty.math.randomInt(0, 1) == 0) ? first.shipWidth : second.shipWidth
  }
}

function transitionScreen(name) {
  Crafty.e("2D, Canvas, " + name)
    .attr({ y: 0, x: -15, w: 640, h: 480 })
    .crop(0, 0, 640, 480);
}

function printHighscores() {
  var sortedHighscore = _.sortBy(highscores, 'score').reverse();

  $highscoresDisplay.empty();
  $highscoresDisplay.append('<p><b>' +  sortedHighscore[0].genome + '</b>:<br />' + sortedHighscore[0].score  + '<p>');
  $highscoresDisplay.append('<p><b>' +  sortedHighscore[1].genome + '</b>:<br />' + sortedHighscore[1].score  + '<p>');
  $highscoresDisplay.append('<p><b>' +  sortedHighscore[2].genome + '</b>:<br />' + sortedHighscore[2].score  + '<p>');
  $highscoresDisplay.append('<p><b>' +  sortedHighscore[3].genome + '</b>:<br />' + sortedHighscore[3].score  + '<p>');
  $highscoresDisplay.append('<p><b>' +  sortedHighscore[4].genome + '</b>:<br />' + sortedHighscore[4].score  + '<p>');
}
