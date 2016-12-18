angular.module('CardStrength', [])
    .factory('Calculations', function() {
        var ret = {};

        ret.activations = function (song, skill) {
            if (skill.type == "notes" || skill.type == "hit" || skill.type == "combo") {
                return Math.floor(song.notes / skill.interval)
            }
            else if (skill.type == "perfects") {
                return Math.floor(song.notes * song.perfects / skill.interval)
            }
            else if (skill.type == "seconds") {
                return Math.floor(song.seconds / skill.interval)
            }
            else {
                //TODO: handle Snow Maiden Umi
                return 0
            }
        };

        ret.scoreUpMod = function(song, scoreUp) {
            return Math.floor(scoreUp / (0.0125 * 1 * Math.floor(song.notes / 2) * 1 * 1.1 * 1.1));
        };

        ret.plScoreBonus = function(on_attr, song, pl_time) {
            var pl_proportion_of_song = pl_time < song.seconds ? song.seconds/pl_time : 1
            var notes_during_pl = Math.floor(song.notes / pl_proportion_of_song);
            var number_of_greats_during_pl = notes_during_pl - Math.floor(notes_during_pl * song.perfects);
            // console.debug(pl_time)
            var note_score_perfect = Math.floor(on_attr * 0.0125 * 1 * Math.floor(song.notes / 2) * 1 * 1.1 * 1.1)
            var note_score_great = Math.floor(on_attr * 0.0125 * .88 * Math.floor(song.notes / 2) * 1 * 1.1 * 1.1)
            var score_difference = (note_score_perfect - note_score_great) * number_of_greats_during_pl
            
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
        $scope.calcAvg = function () {
            $scope.skill.avg = "Loading..."

            if (!$scope.skill) return;
            
            activations = Calculations.activations($scope.song, $scope.skill);
            $scope.skill.avg = Math.floor(activations * $scope.skill.percent) * $scope.skill.amount
            
            if ($scope.skill.category == "Perfect Lock" || $scope.skill.category.includes("Trick")) {
                $scope.skill.stat_bonus_avg = Calculations.plScoreBonus($scope.on_attr, $scope.song, $scope.skill.avg)
            }
            else if (($scope.skill.category == "Healer" || $scope.skill.category.includes("Yell")) && !$scope.equippedSIS) { 
                $scope.skill.stat_bonus_avg = 0;
            }
            else { // scorer or healer
                $scope.skill.stat_bonus_avg = Calculations.scoreUpMod($scope.song, $scope.skill.avg)
            }
        }

        $scope.calcBest = function () {
            $scope.skill.best = "Loading..."
            if (!$scope.skill) return;

            $scope.skill.best = activations * $scope.skill.amount
            if ($scope.skill.category == "Perfect Lock" || $scope.skill.category == "Total Trick" || $scope.skill.category == "Timer Trick") {
                $scope.skill.stat_bonus_best = Calculations.plScoreBonus($scope.on_attr, $scope.song, $scope.skill.best)
            }
            else if (($scope.skill.category == "Healer" || $scope.skill.category.includes("Yell")) && !$scope.equippedSIS) { 
                $scope.skill.stat_bonus_best = 0;
            }
            else {
                $scope.skill.stat_bonus_best = Calculations.scoreUpMod($scope.song, $scope.skill.best)
            }
        }

        // sis calculations 
        $scope.sis = {}
        $scope.calcSIS = function(stat,rarity) {
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
                    $scope.sis.avg = $scope.sis.stat_bonus_avg = Math.floor(stat * .33) / activations
                    $scope.sis.best = $scope.sis.stat_bonus_best = Math.floor(stat * .33)
                }
            }
        }
        $scope.toggleEquipSIS = function() {
            $scope.equippedSIS = !$scope.equippedSIS
        }

        $scope.displayStatBonus = function() {
            var stat_bonus_string = "(+"
            if (!$scope.equippedSIS) {
                
            }
            else {

            }
        }

        // $scope.$watch('$scope.eqippedSIS', function(newVal, oldVal) {
        //     if (newVal !== oldVal) {
        //         if (newVal) {
        //             $scope.calcSIS($scope.skill.category, card.on_attr)
        //         }
        //     }
        // })

        $scope.$on('songUpdate', function (event, args) {
            // $scope.song = args;
            $scope.calcAvg();
            $scope.calcBest();
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