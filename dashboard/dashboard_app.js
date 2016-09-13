define(["app", "apps/dashboard/list/list_controller"], function (OS, DashboardController) {
    OS.module("DashboardApp", function (DashboardApp, OS, Backbone, Marionette, $, _) {
        DashboardApp.Router = OS.AppRouter.extend({
            appRoutes: {
                'my_dashboard': 'showDashboard'
            }
        });
        var API = {
            showDashboard: function () {
                var controller = new DashboardApp.List.Controller();
                controller.show();
            }
        }

        OS.on('screen:dashboard', function () {
            OS.navigate('my_dashboard');
            API.showDashboard();
        });

        OS.addInitializer(function () {
            new DashboardApp.Router({
                controller: API
            });
        });
    });
});
