angular.module('CardStrength', [])
    .factory('Calculations', function() {
        var ret = {};

        ret.activations = function (song, skill) {
            if (skill.type == "notes" || skill.type == "hit" || skill.type == "combo") {
                return Math.floor(song.notes / skill.interval)
            }
            else if (skill.type == "perfects") {
                return Math.floor(Math.floor(song.notes * song.perfects) / skill.interval)
            }
            else if (skill.type == "seconds") {
                return Math.floor(song.seconds / skill.interval)
            }
            else {
                //TODO: handle Snow Maiden Umi and point-based score up
                return 0
            }
        };

        // score = floor(stat * 0.0125 * accuracy * combo_position * note_type * attribute_bool * group_bool)
        ret.scoreUpMod = function(song, scoreUp) {
            // given a score that a card has generated, return stat corresponding to that score
            return Math.floor(scoreUp / song.notes / 0.0125);
        };

        ret.plScoreBonus = function(on_attr, song, pl_time, type) {
            // calculate exactly how many notes are estimated to go great -> perfect
            var pl_proportion_of_song = pl_time < song.seconds ? pl_time/song.seconds : 1
            var notes_during_pl = Math.floor(song.notes * pl_proportion_of_song)
            var transformed_greats_proportion_of_song = notes_during_pl * (1-song.perfects) / song.notes

            // how much the score changed due to greats -> perfects
            var score_difference = Math.floor(on_attr * 0.0125 * .22 * Math.floor(song.notes / 2) * 1 * 1.1 * 1.1) * transformed_greats_proportion_of_song 
            
            if (type == "sis") {
                var bonus = Math.floor(on_attr * 0.33) // trick stat bonus

                // how much the score changed due to greats -> perfects
                var trick_greats_bonus = Math.floor(bonus * 0.0125 * .22 * Math.floor(song.notes / 2) * 1 * 1.1 * 1.1) * transformed_greats_proportion_of_song 

                // how many more points perfects give 
                var perfects_during_pl = notes_during_pl * song.perfects / song.notes
                //// stat value = bonus bc bonus is the only difference between perfect note w/ and w/o trick active 
                var trick_perfects_bonus = Math.floor(bonus * 0.0125 * 1 * Math.floor(song.notes / 2) * 1 * 1.1 * 1.1) * perfects_during_pl

                score_difference = trick_greats_bonus + trick_perfects_bonus 
            }

            return ret.scoreUpMod(song, score_difference)
        }

        return ret;
    })
    .controller('SkillController', function ($scope) {
        $scope.song = {
            perfects: .85,
            notes: 550,
            seconds: 125,
            stars: 60
        }

        $scope.updateSongForChildren = function () {
            if ($scope.song.perfects > 1) $scope.song.perfects = 1; 
            $scope.$broadcast('songUpdate', {"song": $scope.song})
        }
        $scope.onEnter = function(keyEvent) {
            if (keyEvent.which == 13) $scope.updateSongForChildren()
        }

        $scope.equippedSIS = false
        $scope.toggleAllSIS = function () {
            $scope.equippedSIS = !$scope.equippedSIS
            $scope.$broadcast('toggleAllSIS', {"newEquipStatus": $scope.equippedSIS})
        }
        $scope.idlz = false
        $scope.toggleAllIdlz = function () {
            $scope.idlz = !$scope.idlz
            $scope.$broadcast('toggleAllIdlz', {"newIdlzStatus": $scope.idlz})
        }
    })
    .controller('CardController', function ($scope, Calculations) {
        var activations;
        $scope.calcSkill = function () {
            $scope.skill.avg = $scope.skill.best =  "Loading..."

            if (!$scope.skill) return;
            
            activations = Calculations.activations($scope.song, $scope.skill);
            $scope.skill.avg = Math.floor(activations * $scope.skill.percent) * $scope.skill.amount
            $scope.skill.best = activations * $scope.skill.amount

            if ($scope.skill.category == "Perfect Lock" || $scope.skill.category.includes("Trick")) {
                $scope.skill.stat_bonus_avg = Calculations.plScoreBonus($scope.on_attr.base, $scope.song, $scope.skill.avg)
                $scope.skill.stat_bonus_best = Calculations.plScoreBonus($scope.on_attr.base, $scope.song, $scope.skill.best)
            }
            else if (($scope.skill.category == "Healer" || $scope.skill.category.includes("Yell")) && !$scope.equippedSIS) { 
                $scope.skill.stat_bonus_avg = $scope.skill.stat_bonus_best = 0;
            }
            else { // scorer
                $scope.skill.stat_bonus_avg = Calculations.scoreUpMod($scope.song, $scope.skill.avg)
                $scope.skill.stat_bonus_best = Calculations.scoreUpMod($scope.song, $scope.skill.best)
            }
        }

        // sis calculations 
        $scope.sis = {}
        $scope.calcSIS = function(rarity) {
            if (rarity != 'R' && rarity != 'N') {
                // score up: SU skill power x2.5
                if ($scope.skill.category == "Score Up") {
                    $scope.sis.avg = $scope.skill.avg * 2.5
                    $scope.sis.best = $scope.skill.best * 2.5
                    $scope.sis.stat_bonus_avg = Calculations.scoreUpMod($scope.song, $scope.sis.avg)
                    $scope.sis.stat_bonus_best = Calculations.scoreUpMod($scope.song, $scope.sis.best)
                }
                // healer: convert to SU with x480 multiplier
                else if ($scope.skill.category == "Healer") {
                    $scope.sis.avg = $scope.skill.avg * 480
                    $scope.sis.best = $scope.skill.best * 480
                    $scope.sis.stat_bonus_avg = Calculations.scoreUpMod($scope.song, $scope.sis.avg)
                    $scope.sis.stat_bonus_best = Calculations.scoreUpMod($scope.song, $scope.sis.best)
                }
                // PLer: + x0.33 on-attribute stat when PL is active
                else if ($scope.skill.category == "Perfect Lock") {
                    var bonus = Math.floor($scope.on_attr.base * 0.33)
                    $scope.sis.avg = Math.floor($scope.skill.avg / $scope.song.seconds * bonus)
                    $scope.sis.best = Math.floor($scope.skill.best / $scope.song.seconds * bonus)

                    $scope.sis.stat_bonus_avg = Calculations.plScoreBonus($scope.on_attr.base, $scope.song, $scope.skill.avg, "sis")
                    $scope.sis.stat_bonus_best = Calculations.plScoreBonus($scope.on_attr.base, $scope.song, $scope.skill.best, "sis")
                }
            }
        }

        $scope.calcStatBonus = function() {
            if (!$scope.equippedSIS) {
                $scope.on_attr.avg = $scope.on_attr.base + $scope.skill.stat_bonus_avg
                $scope.on_attr.best = $scope.on_attr.base + $scope.skill.stat_bonus_best
            }
            else {
                $scope.on_attr.avg = $scope.on_attr.base + $scope.sis.stat_bonus_avg
                $scope.on_attr.best = $scope.on_attr.base + $scope.sis.stat_bonus_best
            }
            
        }
        $scope.toggleEquipSIS = function() {
            $scope.equippedSIS = !$scope.equippedSIS
            $scope.calcStatBonus();
        }
        
        $scope.$on('songUpdate', function (event, args) {
            $scope.calcSkill();
            $scope.calcSIS();
        })
        $scope.$on('toggleAllSIS', function(event, args) {
            $scope.equippedSIS = args.newEquipStatus;
        })
        $scope.$on('toggleAllIdlz', function(event, args) {
            $scope.idlz = args.newIdlzStatus;
        })
    })
    .config(function ($interpolateProvider) {
        $interpolateProvider.startSymbol('[[');
        $interpolateProvider.endSymbol(']]');
    });