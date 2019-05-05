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
            const baseUrl = 'https://raw.githubusercontent.com/Kanjirito/rivens-json-browse-back-end/master'
            // const baseUrl = 'https://cdn.staticaly.com/gh/Kanjirito/rivens-json-browse-back-end/master'

            vm.platformChoice = []
            vm.selectedPlatform = ''
            vm.mondayChoice = []
            vm.selectedMonday = ''

            vm.showTotalCompare = true

            vm.failed = false
            vm.loading = false
            ngTableEventsChannel.onPagesChanged(onPageChange, $scope)

            vm.getRivens = getRivens
            vm.changePlatform = changePlatform
            vm.changeTheme = changeTheme

            vmInit()

            // =====

            function vmInit() {
                let settings = localStorage.getItem('settings')
                if (settings) {
                    settings = JSON.parse(settings)

                    if (settings['theme'] === 'darkly') {
                        vm.changeTheme()
                    }
                }

                $http.get(`${baseUrl}/data/dates.json`).then((data) => {
                    vm.platformChoice = [
                        { name: 'PC', value: 'PC' },
                        { name: 'Sony Playstation 4', value: 'PS4' },
                        { name: 'Xbox One', value: 'XB1' },
                        { name: 'Nintendo Switch', value: 'SWI' },
                    ]
                    vm.selectedPlatform = 'PC'

                    vm.mondayChoice = {}
                    for (const key of Object.keys(data.data)) {
                        const platformChoice = data.data[key].map((monday) => {
                            return {
                                name: monday,
                                value: monday,
                            }
                        })
                        platformChoice.reverse()
                        vm.mondayChoice[key] = platformChoice
                    }

                    vm.changePlatform(vm.mondayChoice, vm.selectedPlatform)
                    vm.getRivens(vm.selectedPlatform, vm.selectedMonday)
                })
            }

            function changePlatform(mondayChoice, platform) {
                const choices = mondayChoice[platform]
                if (!choices.some((choice) => choice.value === vm.selectedMonday)) {
                    vm.selectedMonday = choices[0].value
                }
            }

            function getRivens(platform, monday) {
                const url = `${baseUrl}/data/${platform}/edited/Riven_data_${platform}_${monday}.json`

                vm.failed = false
                vm.loading = true

                $http.get(url).then((res) => {
                    const rivens = res.data.map((riven) => {
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
                            counts: [10, 25, 50, 100, rivens.length],
                            paginationMaxBlocks: 7,
                            filterOptions: { filterFn: customFilter },
                        }
                    )
                }).catch(() => {
                    vm.failed = true
                }).finally(() => {
                    vm.loading = false
                })
            }

            function customFilter(data, filterValues) {
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

            function onPageChange() {
                window.scrollTo(0, 0)
            }

            function changeTheme(e) {
                if (e) {
                    e.preventDefault()
                }

                let newTheme = 'darkly'
                let currentTheme = 'flatly'

                if (document.body.classList.contains('theme-darkly')) {
                    newTheme = 'flatly'
                    currentTheme = 'darkly'
                }

                document.body.classList.remove(`theme-${currentTheme}`)
                document.body.classList.add(`theme-${newTheme}`)

                const cssFile = document.getElementById('theme-css')
                cssFile.href = cssFile.href.replace(currentTheme, newTheme)

                let settings = localStorage.getItem('settings')
                if (!settings) {
                    settings = {}
                }
                else {
                    settings = JSON.parse(settings)
                }

                settings['theme'] = newTheme
                localStorage.setItem('settings', JSON.stringify(settings))
            }
        }
    ])
    
})(angular, window, document)

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
  document.body.scrollIntoView(true) // For Safari
  document.documentElement.scrollIntoView(true) // For Chrome, Firefox, IE and Opera
}

// When the user clicks on the button, scroll to the bottom of the document 
function bottomFunction() {
    document.body.scrollIntoView(false) // For Safari
    document.documentElement.scrollIntoView(false) // For Chrome, Firefox, IE and Opera
}
