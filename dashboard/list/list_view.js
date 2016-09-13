define(["app", "hbs!templates/apps/dashboard/list/main_view_template",
        "hbs!templates/apps/dashboard/list/title_view_template",
        "hbs!templates/apps/dashboard/list/general_resources_template",
        "hbs!templates/apps/dashboard/list/filter_view_template",
        "hbs!templates/apps/dashboard/list/instance_collection_view_template",
        "hbs!templates/apps/dashboard/list/instance_item_view_template",
        "hbs!templates/apps/dashboard/list/modal_view_template", "progressCircle"
    ],
    function (OS, mainTemplate, titleTemplate, generalResourcesTemplate, filterTemplate, instanceCollectionViewTemplate, instanceItemViewTemplate, modalViewTemplate) {
        OS.module("DashboardApp.List", function (List, OS, Backbone, Marionette, $, _) {


            List.DashboardLayout = Marionette.LayoutView.extend({
                template: mainTemplate,
                regions: {
                    generalResourcesRegion: '#general-resources-region',
                    filterViewRegion: '#filter-view-region',
                    instanceViewRegion: '#instance-view-region'
                }
            });
            List.TitleView = Marionette.ItemView.extend({
                template: titleTemplate,
                className: 'col-md-12',
                events: {}
            });

            List.GeneralResourcesView = Marionette.ItemView.extend({
                template: generalResourcesTemplate,
                className: 'col-md-12',
                initialize: function () {
                    this.vcpus = this.model.get('limits').get('totalCoresUsed');
                    this.ram = this.model.get('limits').get('totalRAMUsed');
                    this.maxVcpus = this.model.get('limits').get('maxTotalCores');
                    this.maxRam = this.model.get('limits').get('maxTotalRAMSize');

                    this.volumes = this.model.get('volLimits').get('totalVolumesUsed');
                    this.volumeStorage = this.model.get('volLimits').get('totalGigabytesUsed');
                    this.maxVolume = this.model.get('volLimits').get('maxTotalVolumes');
                    this.maxVolumeStorage = this.model.get('volLimits').get('maxTotalVolumeGigabytes');

                    this.vcpuPer =  (parseFloat(this.vcpus / this.maxVcpus * 100).toFixed(2)) + '%';
                    this.volumePer = (parseFloat(this.volumes / this.maxVolume * 100).toFixed(2)) + '%';
                    this.ramPer = (parseFloat(this.ram / this.maxRam * 100).toFixed(2)) + '%';
                    this.volumeStoragePer = (parseFloat(this.volumeStorage / this.maxVolumeStorage * 100).toFixed(2)) + '%';

                    this.availableCores = (this.maxVcpus - this.vcpus);
                    this.availableVolume = (this.maxVolume - this.volumes);
                    this.availableRam = (this.maxRam - this.ram);
                    this.availableVolumeStorage = (this.maxVolumeStorage - this.volumeStorage);

                },

                onShow: function () {
                    this.$("#vcpus-pb").css('width', this.vcpuPer);
                    this.$("#volumen-pb").css('width', this.volumePer);
                    this.$("#ram-pb").css('width', this.ramPer);
                    this.$("#storage-pb").css('width', this.volumeStoragePer);
                },


                serializeData: function () {
                    var data = {};
                    var user = JSON.parse(OS.request('get:object:state', 'user'));
                    var isAdmin = _.where(user.roles, {name: "admin"}).length > 0 ? true : false;
                    if (this.model) {
                        data = this.model.toJSON();
                        data.limits = data.limits.toJSON();
                        data.volLimits = data.volLimits.toJSON();
                        data.vcpusPer = this.vcpuPer;
                        data.ramPer = this.ramPer;
                        data.volumePer = this.volumePer;
                        data.volumeStoragePer = this.volumeStoragePer;

                        data.availableCores = this.availableCores;
                        data.availableVolume = this.availableVolume;
                        data.availableRam = this.availableRam;
                        data.availableVolumeStorage = this.availableVolumeStorage;
                        data.isAdmin = isAdmin;


                    }
                    return data;
                },

                events: {
                    'click .js-general-usage-report': 'generalUsageReport'
                },
                generalUsageReport: function () {
                    this.trigger('general:usage:report');
                }
            });

            List.DashboardInstanceFilterView = Marionette.ItemView.extend({
                template: filterTemplate,
                className: 'col-md-12 auro-padding-24',
                events: {
                    'click .js-filter-instances': 'filterInstances',
                    'selectmenuchange #js-instance-count': 'filterInstances',
                    'selectmenuchange #js-filter-region': 'filterInstances',
                    'click .js-create-instance': 'createInstance',
                    'keypress #dashboard-autocomplete': 'checkEnter'
                },

                checkEnter: function (e) {
                    if (e.which === 13) {
                        e.preventDefault();
                        this.$('.js-filter-instances').click();
                    }
                },

                filterInstances: function (e) {
                    this.trigger('filter:instance', this.$('#dashboard-autocomplete').val(), this.$('#js-instance-count option:selected').val(), this.$('#js-filter-region option:selected').val());
                },

                onShow: function () {
                    this.$("select").selectmenu();
                    this.$("#dashboard-autocomplete").autocomplete({
                        source: this.model.get('servers')
                    });
                },

                removeProgressCircleInfo: function () {
                    $('.ProgressCircleInfo').remove();
                },

                createInstance: function () {
                    OS.trigger('screen:instance:create');
                }
            });

            List.DashboardInstanceItemView = Marionette.ItemView.extend({
                template: instanceItemViewTemplate,
                events: {
                    'click .js-instance-btn-edit': 'editInstance'
                },
                editInstance: function () {
                    this.trigger('instance:edit', {id: this.$('.js-instance-btn-edit')[0].id});
                },

                onShow: function () {
                    this.createProgressCircle();
                },

                serializeData: function () {
                    var data = Marionette.ItemView.prototype.serializeData.call(this);
                    data.serverDetail = data.serverDetail.toJSON();
                    data.serverDetail.flavourDetail = data.serverDetail.flavourDetail.toJSON();
                    data.serverDetail.imageDetail = data.serverDetail.imageDetail.toJSON();
                    return data;
                },

                createProgressCircle: function () {
                    var limits = this.options.tenant.get('limits');
                    var data = this.model.get('serverDetail').get('flavourDetail').get('flavor');

                    var mainCanvas = this.$('#main_canvas')[0];
                    var vcpus = data.vcpus / limits.get('maxTotalCores') * 0.75,
                        ram = data.ram / limits.get('maxTotalRAMSize') * 0.75,
                        disk = data.disk / 500 * 0.75,
                        p4 = 300 / 1500 * 0.75,
                        p5 = 5 / 10 * 0.75,
                        a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0;

                    var circle = new ProgressCircle({
                        canvas: mainCanvas,
                        minRadius: 14.5,
                        arcWidth: 14.5,
                        gapWidth: 3
                    });


                    circle.addEntry({
                        fillColor: 'rgba(253, 206, 71, 1)',
                        progressListener: function () {
                            return a1;
                        },
                        infoListener: function () {
                            return 'VCPUS';
                        }
                    }).addEntry({
                        fillColor: 'rgba(71, 195, 220, 1)',
                        progressListener: function () {
                            return a2;
                        },
                        infoListener: function () {
                            return 'GB';
                        }
                    }).addEntry({
                        fillColor: 'rgba(83, 130, 195, 1)',
                        progressListener: function () {
                            return a3;
                        },
                        infoListener: function () {
                            return 'GB';
                        }
                    }).addEntry({
                        fillColor: 'rgba(88, 196, 190, 1)',
                        progressListener: function () {
                            return a4;
                        },
                        infoListener: function () {
                            return 'GB';
                        }
                    }).addEntry({
                        fillColor: 'rgba(239, 104, 46, 1)',
                        progressListener: function () {
                            return a5;
                        },
                        infoListener: function () {
                            return 'GB/S';
                        }
                    }).start(33);

                    var timer = setInterval(function () {
                        if (a1 < vcpus) {
                            a1 = a1 < vcpus ? a1 + (0.05 * vcpus) : 0;
                            a2 = a2 < ram ? a2 + (0.05 * ram) : 0;
                            a3 = a3 < disk ? a3 + (0.05 * disk) : 0;
                            a4 = a4 < p4 ? a4 + (0.05 * p4) : 0;
                            a5 = a5 < p5 ? a5 + (0.05 * p5) : 0;
                        }
                        else
                            clearTimeout(timer);
                    }, 20);


                }
            });

            List.DashboardInstancecCollectionView = Marionette.CompositeView.extend({
                tagName: 'div',
                template: instanceCollectionViewTemplate,
                childView: List.DashboardInstanceItemView,
                childViewContainer: 'div',
                childViewOptions: function () {
                    return {
                        tenant: this.options.tenant
                    };
                },
                events: {},

                collectionEvents: {
                    'change': 'changed',
                    'add': 'changed'
                },

                changed: function () {
                    this.render();
                }
            });

            List.ModalView = Marionette.ItemView.extend({
                template: modalViewTemplate,
                className: 'modal',
                events: {
                    'click .js-save-changes': 'saveChanges'
                },

                serializeData: function () {
                    var data = {};
                    if (this.model) {
                        data = this.model.toJSON();
                        data.securityGroups = [];
                        this.options.securityGroups.each(function (securityGroup) {
                            var group = {id: securityGroup.get('id'), name: securityGroup.get('name')};
                            _.each(data.serverDetail.get('security_groups'), function (selectedGroup) {
                                if (securityGroup.get('name') === selectedGroup.name) {
                                    group.selected = true;
                                }
                            });
                            data.securityGroups.push(group);
                        });
                    }
                    return data;
                },

                saveChanges: function () {
                    var data = {};
                    data.id = this.model.get('id');
                    data.instance = new OS.Entities.Server();
                    var security_groups = [];
                    this.$('.js-security-groups:checked').each(function (index, group) {
                        security_groups.push({name: group.id});
                    });
                    data.instance.set('server', {security_groups: security_groups, name: this.$('.js-name').val()});

                    this.trigger('update:instance', data);
                }
            });
        });
    });
