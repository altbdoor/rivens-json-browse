((angular, window, document) => {
    angular.module('RivensBrowseApp', ['ngTable']).config([
        '$compileProvider',
        ($compileProvider) => {
            $compileProvider.debugInfoEnabled(false)
            $compileProvider.commentDirectivesEnabled(false)
        }
    ])

    .controller('RivensBrowseController', [
        '$http', 'NgTableParams', '$scope', 'ngTableEventsChannel',
        function($http, NgTableParams, $scope, ngTableEventsChannel) {
            const vm = this

            vm.platforms = [
                { name: 'PC', value: 'PC' },
                { name: 'Sony Playstation 4', value: 'PS4' },
                { name: 'Xbox One', value: 'XB1' },
                { name: 'Nintendo Switch', value: 'SWI' },
            ]
            vm.selectedPlatform = 'PC'

            vm.loading = false
            vm.failed = false
            vm.lastModified = ''

            vm.getRivens = getRivens
            ngTableEventsChannel.onPagesChanged(onPageChange, $scope)

            // =====

            getRivens(vm.selectedPlatform)

            function getRivens (platform) {
                const url = `https://n9e5v4d8.ssl.hwcdn.net/repos/weeklyRivens${platform}.json`
                vm.loading = true
                vm.failed = false

                $http.get(url).then((res) => {
                    vm.lastModified = res.headers('last-modified')

                    const rivenPopAsc = res.data.sort((a, b) => a.pop > b.pop)
                    const oneSoldRiven = rivenPopAsc.filter((riven) => {
                        return (riven.min === riven.max && riven.min === riven.avg && riven.stddev === 0)
                    })

                    let popRatio = 1
                    if (oneSoldRiven.length > 0) {
                        popRatio = 1 / oneSoldRiven[0].pop
                    }
                    else if (rivenPopAsc.length > 0) {
                        popRatio = 1 / rivenPopAsc[0].pop
                    }

                    const rivens = res.data.map((riven) => {
                        if (!riven.compatibility) {
                            riven.compatibility = '-- Veiled --'
                        }

                        riven.itemType = riven.itemType.replace('Riven Mod', '')
                        riven.estSold = riven.pop * popRatio
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
                    );

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
