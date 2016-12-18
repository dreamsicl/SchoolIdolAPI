var calcActivations = function (song, skill) {
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
}

var calcScoreUpMod = function(song, skillAccumulation) {
    return Math.floor((skillAccumulation / song.notes) / (0.0125 * (.88 * song.perfects) * Math.floor(song.notes / 2) * 1 * 1.1 * 1.1)) * song.notes;
}
angular.module('CardStrength', [])
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
        // $scope.$watch('$scope.song', function(newVal, oldVal) {
        //     if (newVal !== oldVal) {
        //         $scope.$broadcast('songUpdate', {"val": newVal})
        //         console.log("song changed")
        //     }
        // })
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
    .controller('CardController', function ($scope) {
        // $scope.skill = {};
        // $scope.skill.avg = "Loading..."
        // $scope.skill.best = "Loading..."
        $scope.calcAvg = function () {
            $scope.skill.avg = "Loading..."
            if ($scope.skill) {
                $scope.skill.avg = calcActivations($scope.song, $scope.skill) * $scope.skill.percent * $scope.skill.amount
                $scope.skill.stat_bonus_avg = calcScoreUpMod($scope.song, $scope.skill.avg)
            }
        }

        $scope.calcBest = function () {
            $scope.skill.best = "Loading..."
            if ($scope.skill) {
                $scope.skill.best = calcActivations($scope.song, $scope.skill) * $scope.skill.amount 
                $scope.skill.stat_bonus_best = calcScoreUpMod($scope.song, $scope.skill.best)
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
                    $scope.sis.stat_bonus_avg = calcScoreUpMod($scope.song, $scope.sis.avg)
                    $scope.sis.stat_bonus_best = calcScoreUpMod($scope.song, $scope.sis.best)
                }
                // healer: convert to SU with x480 multiplier
                else if ($scope.skill.category == "Healer") {
                    $scope.sis.avg = $scope.skill.avg * 480
                    $scope.sis.best = $scope.skill.best * 480
                    $scope.sis.stat_bonus_avg = calcScoreUpMod($scope.song, $scope.sis.avg)
                    $scope.sis.stat_bonus_best = calcScoreUpMod($scope.song, $scope.sis.best)
                }
                // PLer: + x0.33 on-attribute stat when PL is active
                else if ($scope.skill.category == "Perfect Lock") {
                    // $scope.sis.avg = $scope.sis.stat_bonus_avg =  (stat * .33)
                    // $scope.sis.best = $scope.sis.stat_bonus_best  =  $scope.skill.best * (stat * .33)
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