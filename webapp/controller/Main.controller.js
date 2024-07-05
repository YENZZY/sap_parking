sap.ui.define([
    "parking/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
],
function (Controller, JSONModel, MessageBox,Filter,FilterOperator) {
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
            
                this.setModel(new JSONModel(aGetData), "paidModel");
            
            }.bind(this)).fail(function () {

                MessageBox.information("지점 조회를 할 수 없습니다.");

            });
        },

        //차량 조회
        onSearch: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            var oSearch = this.byId("findNumber"); // 검색 화면
            var ButtonData = oSearch.getValue();

            if(ButtonData.length!==4){

                oSearch.setValue("");
                MessageBox.information("차량번호 4자리를 입력해주세요.");

            }else{

              var oNumberPlate = [new Filter("NumberPlate", FilterOperator.EQ, ButtonData)];

              oMainModel.read("/Carinfo", {
                filters: oNumberPlate,
                success: function (oData) {
                    if (oData.results && oData.results.length > 0) {
                        var UuidData = oData.results[0].Uuid;
                        this.navTo("Page", {
                            Uuid: UuidData
                        });
                    }  else {
                        MessageBox.information("차량번호가 조회되지 않습니다.");
                    }
                }.bind(this),
                error: function () {
                    MessageBox.error("데이터 조회 중 오류가 발생했습니다.");
                }
            });
            }
        },

        //할인권 구매 버튼 클릭시 이동
        onClick: function (oEvent) {
            var ButtonText = oEvent.getSource().getText(); // 키패드 고유 값
            var oSearch = this.byId("findNumber"); // 검색 화면
            var ButtonData = oSearch.getValue();

            oSearch.setValue(ButtonData + ButtonText);
        },

        //키패드 searchfield 데이터 삭제
        onClear: function () {
            var oSearch = this.byId("findNumber");

            oSearch.setValue("");
        },

        //할인권 구매 버튼 클릭시 이동
        onBuy: function () {

        },

        //정기권 구매 dialog
        onRegister: function () {
            if(!this.oCarDialog) {
                this.oCarDialog = this.loadFragment({
                    name: "parking/view/Fragments/CarDialog"
                });
            }
            this.oCarDialog.then(function (oDialog) {
                this.oDialog = oDialog;
                this.oDialog.open();
            
            }.bind(this));
        },

        //정기권 구매 다이얼로그 저장
        onSaveCar: function () {
            this.oDialog.close();
        },

        //정기권 구매 다이얼로그 닫기
        onCloseCar: function () {
            this.oDialog.close();
        },

        //다이얼로그 초기화
        

    });
});
