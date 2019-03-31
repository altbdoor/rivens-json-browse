((angular, window, document) => {
    angular.module('RivensBrowseApp', ['ngTable']).config([
        '$compileProvider',
        ($compileProvider) => {
            $compileProvider.debugInfoEnabled(false)
            $compileProvider.commentDirectivesEnabled(false)
        }
    ])

    .controller('RivensBrowseController', [
        '$http', '$q', 'NgTableParams',
        function($http, $q, NgTableParams) {
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

            vm.getRivens = getRivens

            // =====

            getRivens(vm.selectedPlatform)

            function getRivens (platform) {
                const url = `http://n9e5v4d8.ssl.hwcdn.net/repos/weeklyRivens${platform}.json`
                vm.loading = true
                vm.failed = false

                $http.get(url).then((res) => {
                    const rivens = res.data.map((riven) => {
                        if (!riven.compatibility) {
                            riven.compatibility = '-- N/A --'
                        }

                        riven.itemType = riven.itemType.replace('Riven Mod', '')
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
                    window.xxx = vm.tableParams;

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

                return filteredData
            }
        }
    ])

})(angular, window, document)
