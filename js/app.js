const BrowserWindow = require('electron').remote.BrowserWindow;
const remote = require('electron').remote;
const win =remote.getCurrentWindow();
function maximizeApp() {
  win.maximize();
}
function minimizeApp() {
    win.minimize();
}
function closeApp() {
    win.close();
}
angular.module("pouchapp",[])

.run(function($pouchDB) {
    $pouchDB.setDatabase("todo");
    $pouchDB.sync("http://localhost:4984/test-database");
})

.controller("MainController", function($scope, $rootScope, $pouchDB) {

    $scope.items = {};

    $pouchDB.startListening();

    // Listen for changes which include create or update events
    $rootScope.$on("$pouchDB:change", function(event, data) {
        $scope.items[data.doc._id] = data.doc;
        $scope.$apply();
    });

    // Listen for changes which include only delete events
    $rootScope.$on("$pouchDB:delete", function(event, data) {
        delete $scope.items[data.doc._id];
        $scope.$apply();
    });



    // Save a document with either an update or insert
    $scope.save = function(todoText) {
        var jsonDocument = {
            "todo": todoText,
            "done": false
        };
        document.getElementById("todoForm").reset();
        $pouchDB.save(jsonDocument).then(function(response) {
        }, function(error) {
            console.log("ERROR -> " + error);
        });
    }

    $scope.delete = function(id, rev) {
        $pouchDB.delete(id, rev);
    }

})

.service("$pouchDB", ["$rootScope", "$q", function($rootScope, $q) {

    var database;
    var changeListener;

    this.setDatabase = function(databaseName) {
        database = new PouchDB(databaseName);
    }

    this.startListening = function() {
        changeListener = database.changes({
            live: true,
            include_docs: true
        }).on("change", function(change) {
            if(!change.deleted) {
                $rootScope.$broadcast("$pouchDB:change", change);
            } else {
                $rootScope.$broadcast("$pouchDB:delete", change);
            }
        });
    }

    this.stopListening = function() {
        changeListener.cancel();
    }

    this.sync = function(remoteDatabase) {
        database.sync(remoteDatabase, {live: true, retry: true});
    }

    this.save = function(jsonDocument) {
        var deferred = $q.defer();
        if(!jsonDocument._id) {
            database.post(jsonDocument).then(function(response) {
                deferred.resolve(response);
            }).catch(function(error) {
                deferred.reject(error);
            });
        } else {
            database.put(jsonDocument).then(function(response) {
                deferred.resolve(response);
            }).catch(function(error) {
                deferred.reject(error);
            });
        }
        return deferred.promise;
    }

    this.delete = function(documentId, documentRevision) {
        return database.remove(documentId, documentRevision);
    }

    this.get = function(documentId) {
        return database.get(documentId);
    }

    this.destroy = function() {
        database.destroy();
    }

}]);
