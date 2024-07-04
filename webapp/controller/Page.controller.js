sap.ui.define([
    "parking/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
],
function (Controller, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend("parking.controller.Page", {
        onInit: function () {
            this.getRouter().getRoute("Page").attachMatched(this._onRouteMatched, this);

        },

        _onRouteMatched: function () {
            this._getData();
        },

        _getData: function () {

            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기
            
            this._getODataRead(oMainModel, "/Carinfo").done(
    
                function(aGetData) {
                
                    this.setModel(new JSONModel(aGetData), "carModel");
                
                }.bind(this)).fail(function () {
    
                    MessageBox.information("지점 조회를 할 수 없습니다.");
    
                });
        },

        //정산 버튼 클릭시 이동
        onpay: function () {

        }
    });
});
