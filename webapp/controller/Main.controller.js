sap.ui.define([
    "parking/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
],
function (Controller, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend("parking.controller.Main", {
        onInit: function () {
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);

        },

        _onRouteMatched: function () {
            this._getData();
        },

        _getData: function () {

        var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기
        
        this._getODataRead(oMainModel, "/Carinfo").done(

            function(aGetData) {
            
                this.setModel(new JSONModel(aGetData), "carinfoModel");
            
            }.bind(this)).fail(function () {

                MessageBox.information("지점 조회를 할 수 없습니다.");

            });
        },

        //차량 조회
        onSearch: function () {
            this.navTo("Page" , {});
        },

        //할인권 구매 버튼 클릭시 이동
        onClick: function () {
            var ButtonText = oEvent.getSource().getText(); // 키패드 고유 값
            var oSearchField = this.byId("findNumber"); // 검색 화면
            var ButtonData = oSearchField.getValue();

            oSearchField.setValue(ButtonData + ButtonText);
        },

        //할인권 구매 버튼 클릭시 이동
        onBuy: function () {

        }
    });
});
