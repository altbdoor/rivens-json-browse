((angular, window, document) => {
    angular.module('RivensBrowseApp', ['ngTable']).config([
        '$compileProvider',
        ($compileProvider) => {
            $compileProvider.debugInfoEnabled(false)
            $compileProvider.commentDirectivesEnabled(false)
        }
    ])

    .controller('RivensBrowseController', [
        '$http', 'NgTableParams', '$scope', 'ngTableEventsChannel', '$filter',
        function($http, NgTableParams, $scope, ngTableEventsChannel, $filter) {
            const vm = this

            vm.platforms = [
                { name: 'PC', value: 'PC' },
                { name: 'Sony Playstation 4', value: 'PS4' },
                { name: 'Xbox One', value: 'XB1' },
                { name: 'Nintendo Switch', value: 'SWI' },
            ]
            vm.selectedPlatform = 'PC'

            vm.mondayList = getMondayList(new Date('2019-03-25'))
            vm.selectedMonday = vm.mondayList[0]

            vm.showTotalCompare = true

            vm.getRivens = getRivens

            vm.failed = false
            vm.loading = false
            ngTableEventsChannel.onPagesChanged(onPageChange, $scope)

            // =====

            getRivens(vm.selectedPlatform, vm.selectedMonday)

            function getMondayList (firstMonday) {
                const currentDay = new Date()
                const mondayList = []
                let lastMonday = new Date(firstMonday)

                do {
                    mondayList.push(new Date(lastMonday))
                    lastMonday.setDate(lastMonday.getDate() + 7)
                } while (lastMonday < currentDay)

                mondayList.reverse()
                return mondayList
            }

            function getRivens (platform, monday) {
                let url = 'TOTAL_PC'

                if (monday !== 'all') {
                    const mondayFormatted = $filter('date')(monday, 'yy-MM-dd')
                    url = `Riven_data_${platform}_${mondayFormatted}`
                }

                url = `https://raw.githubusercontent.com/Kanjirito/rivens-json-browse-back-end/master/data/${platform}/edited/${url}.json`

                vm.failed = false
                vm.loading = true

                $http.get(url).then((res) => {
                    let rivens = res.data

                    if (monday === 'all') {
                        rivens = res.data[1]
                    }

                    rivens = rivens.map((riven) => {
                        if (!riven.compatibility) {
                            riven.compatibility = '-- Veiled --'
                        }

                        riven.itemType = riven.itemType.replace('Riven Mod', '').trim()
                        return riven
                    })

                    vm.tableParams = new NgTableParams(
                        {
                            count: 25,
                            sorting: { compatibility: 'asc' },
                        },
                        {
                            dataset: rivens,
                            counts: [10, 25, 50, 100],
                            paginationMaxBlocks: 8,
                            filterOptions: { filterFn: customFilter },
                        }
                    )
                }).catch(() => {
                    vm.failed = true
                }).finally(() => {
                    vm.loading = false
                })
            }

            function customFilter (data, filterValues) {
                let filteredData = data.filter((item) => {
                    const min = filterValues.min || 0
                    const max = filterValues.max || Number.MAX_VALUE

                    return item.min >= min && item.max <= max
                })

                const textFilters = ['compatibility', 'itemType'].filter((filterName) => filterValues[filterName])
                textFilters.forEach((filterName) => {
                    filteredData = filteredData.filter((item) => {
                        const itemCompat = item[filterName].toLowerCase()
                        const filterCompat = filterValues[filterName].toLowerCase()
                        return (itemCompat.indexOf(filterCompat) !== -1)
                    })
                })

                if (typeof filterValues.rerolled !== 'undefined') {
                    filteredData = filteredData.filter((item) => item.rerolled === filterValues.rerolled)
                }

                return filteredData
            }

            function onPageChange () {
                window.scrollTo(0, 0)
            }
        }
    ])

})(angular, window, document)
