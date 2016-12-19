angular.module('CardStrength', [])
    .factory('Calculations', function () {
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
        ret.scoreUpMod = function (song, scoreUp) {
            // given a score that a card has generated, return stat corresponding to that score
            return Math.floor(scoreUp / song.notes / 0.0125);
        };

        ret.plScoreBonus = function (on_attr, song, pl_time, type) {
            // calculate exactly how many notes are estimated to go great -> perfect
            var pl_proportion_of_song = pl_time < song.seconds ? pl_time / song.seconds : 1
            var notes_during_pl = Math.floor(song.notes * pl_proportion_of_song)
            var transformed_greats_proportion_of_song = notes_during_pl * (1 - song.perfects) / song.notes

            // how much the score changed due to greats -> perfects
            var score_difference = Math.floor(on_attr * 0.0125 * .22 * Math.floor(song.notes / 2) * 1 * 1.1 * 1.1) * transformed_greats_proportion_of_song

            return ret.scoreUpMod(song, score_difference)
        }

        ret.trickStatBonus = function(on_attr, song, pl_time) {
            // calculate exactly how many notes are estimated to go great -> perfect
            var pl_proportion_of_song = pl_time < song.seconds ? pl_time / song.seconds : 1
            var notes_during_pl = Math.floor(song.notes * pl_proportion_of_song)
            var greats_during_pl = notes_during_pl * (1 - song.perfects) / song.notes
            var perfects_during_pl = notes_during_pl * song.perfects / song.notes

            var bonus = Math.floor(on_attr * 0.33) 
            // how many more points greats give
            var trick_greats_bonus = Math.floor(bonus * 0.0125 * .22 * Math.floor(song.notes / 2) * 1 * 1.1 * 1.1) * greats_during_pl
            // how many more points perfects give 
            var trick_perfects_bonus = Math.floor(bonus * 0.0125 * 1 * Math.floor(song.notes / 2) * 1 * 1.1 * 1.1) * perfects_during_pl

            return ret.scoreUpMod(song,trick_greats_bonus + trick_perfects_bonus)
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
            $scope.$broadcast('songUpdate', { "song": $scope.song })
        }
        $scope.onEnter = function (keyEvent) {
            if (keyEvent.which == 13) $scope.updateSongForChildren()
        }

        $scope.equippedSIS = false
        $scope.toggleAllSIS = function () {
            $scope.equippedSIS = !$scope.equippedSIS
            $scope.$broadcast('toggleAllSIS', { "newEquipStatus": $scope.equippedSIS })
        }
        $scope.idlz = false
        $scope.toggleAllIdlz = function () {
            $scope.idlz = !$scope.idlz
            $scope.$broadcast('toggleAllIdlz', { "newIdlzStatus": $scope.idlz })
        }
    })
    .controller('CardController', function ($scope, Calculations) {
        
        var activations;

        $scope.calcSkill = function () {
            $scope.skill.avg = $scope.skill.best = "Loading..."

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
        $scope.sis = { }
        var calcTrickStatBonus = function (idlz) {
            var stat;
            if (idlz) stat = $scope.on_attr.idlz
            else stat = $scope.on_attr.base
            
            var bonus = Math.floor(stat * 0.33)

            $scope.sis.avg = Math.floor($scope.skill.avg / $scope.song.seconds * bonus)
            $scope.sis.best = Math.floor($scope.skill.best / $scope.song.seconds * bonus)

            $scope.sis.stat_bonus_avg = Calculations.trickStatBonus(stat, $scope.song, $scope.skill.avg)
            $scope.sis.stat_bonus_best = Calculations.trickStatBonus(stat, $scope.song, $scope.skill.best)
        }
        $scope.calcSIS = function () {
            if ($scope.rarity == 'R' || $scope.is_promo) {
                $scope.sis = $scope.skill
                return;            
            }

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

                calcTrickStatBonus($scope.idlz);
            } else return;
        }

        $scope.calcStatBonus = function () {
            var base, bonus = {};
            if (!$scope.idlz) {
                base = $scope.on_attr.base
            } else base = $scope.on_attr.idlz

            if (!$scope.equippedSIS) {
                bonus.avg = $scope.skill.stat_bonus_avg
                bonus.best = $scope.skill.stat_bonus_best
            }
            else {
                bonus.avg = $scope.sis.stat_bonus_avg
                bonus.best = $scope.sis.stat_bonus_best
            }
            
            $scope.on_attr.avg = base + bonus.avg
            $scope.on_attr.best = base + bonus.best

        }

        // toggles
        $scope.toggleEquipSIS = function (fromParent) {
            if (!fromParent) $scope.equippedSIS = !$scope.equippedSIS
            $scope.calcStatBonus();
        }
        $scope.toggleIdlz = function (fromParent) {

            if ($scope.idlz && $scope.skill.category == "Perfect Lock") {
                $scope.calcSIS();
            }

            $scope.calcStatBonus();
        }

        $scope.$on('songUpdate', function (event, args) {
            $scope.calcSkill();
            $scope.calcSIS();
        })
        $scope.$on('toggleAllSIS', function (event, args) {
            $scope.equippedSIS = args.newEquipStatus;
            $scope.toggleEquipSIS(true)
        })
        $scope.$on('toggleAllIdlz', function (event, args) {
            $scope.idlz = args.newIdlzStatus;
            $scope.toggleIdlz(true);
        })

    })
    .config(function ($interpolateProvider) {
        $interpolateProvider.startSymbol('[[');
        $interpolateProvider.endSymbol(']]');
    });