define(["app", "apps/dashboard/list/list_view", "entities/dashboard", "entities/server", "entities/instance"], function (OS, View) {
    OS.module("DashboardApp.List", function (List, OS, Backbone, Marionette, $, _) {

        List.Controller = Marionette.Controller.extend({
            initialize: function (options) {
                this.region = options.region || OS.mainRegion;
                this.titleRegion = options.titleRegion || OS.titleRegion;
                this.modalRegion = options.modalRegion || OS.modalRegion;
            },

            show: function () {
                var self = this;
                var layout = new List.DashboardLayout();
                this.layout = layout;

                var fetchingEntity = OS.request('dashboard:entity');
                var securityGroups = OS.request('instance:security:groups');
                var availabilityZones = OS.request('availability:zones');
                $.when(fetchingEntity, securityGroups, availabilityZones).done(function (generalResourcesEntity, securityGroups, availabilityZones) {
                    console.log(availabilityZones);
                    self.region.show(layout);
                    self.generalResourcesEntity = generalResourcesEntity;
                    self.securityGroups = securityGroups;
                    var titleView = new List.TitleView({
                        model: self.generalResourcesEntity.getGeneralResourcesModel().get('limits')
                    });
                    self.titleRegion.show(titleView);
                    self.showInstanceFilterView(self.generalResourcesEntity.getFilterViewModel());
                    self.showGeneralResources(self.generalResourcesEntity.getGeneralResourcesModel());
                    self.instanceCollection = generalResourcesEntity.getInstancesCollection();
                    self.instanceCollectionCopy = self.instanceCollection.toJSON();
                    self.showInstanceView(self.instanceCollection, self.generalResourcesEntity.get('tenant'));
                    /*OS.hidePleaseWait();*/
                });


            },

            convertJSONtoCSV: function (JSONData, ReportTitle, ShowLabel) {
                var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData,
                    CSV = '';
                if (ShowLabel) {
                    var row = "";
                    for (var index in arrData[0]) {
                        row += index + ',';
                    }
                    row = row.slice(0, -1);
                    CSV += row + '\r\n';
                }

                for (var i = 0; i < arrData.length; i++) {
                    var row = "",
                        count = 0;
                    for (var index in arrData[i]) {
                        if (count > 0) {
                            row += ",";
                        }
                        row += arrData[i][index];
                        count++;
                    }
                    row.slice(0, row.length - 1);
                    CSV += row + '\r\n';
                }

                if (CSV == '') {

                    return;
                }

                var fileName = ReportTitle.replace(/ /g, "_") + ".csv";
                var blob = new Blob([CSV], {type: 'text/csv;charset=utf-8;'});
                if (navigator.msSaveBlob) {

                    navigator.msSaveBlob(blob, fileName);
                } else {
                    var link = document.createElement("a");
                    if (link.download !== undefined) { // feature detection
                        // Browsers that support HTML5 download attribute
                        var url = URL.createObjectURL(blob);
                        link.setAttribute("href", url);
                        link.setAttribute("download", fileName);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                }
            },

            showGeneralResources: function (generalResourcesModel) {
                var self = this;
                var generalResourcesView = new List.GeneralResourcesView({
                    model: generalResourcesModel
                });
                this.layout.generalResourcesRegion.show(generalResourcesView);

                generalResourcesView.on('general:usage:report', function () {
                    var generalUsage = OS.request('general:usage:report');

                    $.when(generalUsage).done(function (reportData) {
                        var reportJson = reportData.toJSON();
                        self.convertJSONtoCSV(reportJson, "Usage Report", true);
                    });

                });
            },

            showInstanceFilterView: function (filterModel) {
                var instanceFilterView = new List.DashboardInstanceFilterView({
                    model: filterModel
                });
                instanceFilterView.on('filter:instance', function (instanceName, count, region) {
                    instanceFilterView.removeProgressCircleInfo();
                    this.instanceCollection.filterInstance(instanceName, count, region, this.instanceCollectionCopy);
                }, this);
                this.layout.filterViewRegion.show(instanceFilterView);
            },

            showInstanceView: function (instanceCollection, tenant) {
                var self = this;
                var instanceCollectionView = new List.DashboardInstancecCollectionView({
                    collection: instanceCollection,
                    tenant: tenant
                });

                instanceCollectionView.on('childview:instance:edit', function (iv, fv) {
                    var editInstanceView = new List.ModalView({
                        model: iv.model,
                        securityGroups: self.securityGroups
                    });

                    self.modalRegion.show(editInstanceView);

                    editInstanceView.on('update:instance', function (data) {
                        var updateInstance = OS.request('update:instance', data);
                        $.when(updateInstance).done(function (instance) {
                            instanceCollectionView.collection.get(data.id).set('name', instance.server.name);
                        });
                    });
                });
                this.layout.instanceViewRegion.show(instanceCollectionView);
            }

        });

    });
});
