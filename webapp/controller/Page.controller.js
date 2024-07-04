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

        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            this.Uuid = oArgs.Uuid;

            this._getData();
        },

        _getData: function () {
            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기
            var uuidPath = "/Carinfo(guid'"+this.Uuid+"')";
            oMainModel.read(uuidPath, {
                success: function (oData) {
                    var oCarinfoModel = new JSONModel(oData);
                    this.setModel(oCarinfoModel,"carinfoModel");
                    this.calculateParkingTime();
                }.bind(this), error: function () {
                    MessageBox.information("지점 조회를 할 수 없습니다.");
                }
            });
            
        },

        //주차시간 구하기
        calculateParkingTime: function () {
            
            var oCarinfoModel = this.getView().getModel("carinfoModel");

            if (!oCarinfoModel) {

                MessageBox.error("carinfoModel을 찾을 수 없습니다.");
                return;
            
            }

            var entryTime = oCarinfoModel.getProperty("/EntryTime");

            if (entryTime) {
                var entryDate = new Date(entryTime);
                var currentTime = new Date();
                // 주차 시간 구하기 (시간/분 형식)
                var oParkingTime = currentTime.getTime() - entryDate.getTime();
                var oParkingHour = Math.floor(oParkingTime / (1000 * 60 * 60)); // 시간
                var oParkingMinutes = Math.floor((oParkingTime % (1000 * 60 * 60)) / (1000 * 60)); // 분

                var fee = (oParkingHour + (oParkingMinutes > 0 ? 1 : 0)) * 1000;
                
                var ofee = this.byId("ParkingFee")
                var oPkTime = this.byId("ParkingTime");

                if (oPkTime) {
                
                    oPkTime.setValue(oParkingHour + " 시간 " + oParkingMinutes + " 분");
                
                } else {
                
                    MessageBox.error("주차 시간 데이터를 불러오지 못했습니다.");
                
                }
                
                if (ofee) {
                
                    ofee.setValue("요금 : " + fee + "원");
                
                } else {
                
                    MessageBox.error("주차 요금 데이터를 불러오지 못했습니다.");
                
                }
            }
        },

        //정산 버튼 클릭시 이동
        onpay: function () {

        }
    });
});
