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
            var ticketPath = "/Carinfo(guid'"+this.Uuid+"')/to_Ticket";
            
            // 헤드 데이터
            oMainModel.read(uuidPath, {
                success: function (oData) {
                    var oCarinfoModel = new JSONModel(oData);
                    if(oData.TypeName === "정기권 차량"){
                        this.adminpage();
                    }else{
                        this.userpage();
                    }
                    this.setModel(oCarinfoModel,"carinfoModel");

                }.bind(this), error: function () {
                    MessageBox.information("carinfoModel 조회를 할 수 없습니다.");
                }
            });

            oMainModel.read(ticketPath, {
                success: function (oData2) {
                    console.log(oData2);
                    var oMyTicketModel = new JSONModel(oData2.results);
                    this.setModel(oMyTicketModel,"myticketModel");
                    this.calculateParkingTime();
                }.bind(this), error: function () {
                    MessageBox.information("myticketModel 조회를 할 수 없습니다.");
                }
            });
        },

        // 주차요금 계산하기 (할인 쿠폰 적용)
        calculateParkingTime: function () {
            var oCarinfoModel = this.getView().getModel("carinfoModel");
            var oMyticketModel = this.getView().getModel("myticketModel");

            if (!oCarinfoModel) {
                MessageBox.error("carinfoModel을 찾을 수 없습니다.");
                return;
            }

            var entryTime = oCarinfoModel.getProperty("/EntryTime");
            var typeName = oCarinfoModel.getProperty("/TypeName");

            if (entryTime) {
                var entryDate = new Date(entryTime);
                var currentTime = new Date();
                // 주차 시간 구하기 (시간/분 형식)
                var oParkingTime = currentTime.getTime() - entryDate.getTime();
                var oParkingHour = Math.floor(oParkingTime / (1000 * 60 * 60)); // 시간
                var oParkingMinutes = Math.floor((oParkingTime % (1000 * 60 * 60)) / (1000 * 60)); // 분

                var fee = (oParkingHour + (oParkingMinutes > 0 ? 1 : 0)) * 1000;

                var ofee = this.byId("ParkingFee");
                var oPkTime = this.byId("ParkingTime");
                var oDisFeeId = this.byId("ParkingDisFee");

                var totalDisTime = 0;
                var totalDisFee = 0;

                if (oMyticketModel && oMyticketModel.getProperty("/").length) {
                    oMyticketModel.getProperty("/").forEach(function (item) {
                        // totalDisTime += item.UsedCount * item.DiscountTime;
                        totalDisFee += item.UsedCount * item.DiscountTime * 1000;
                    });
                }

                var discountedParkingHours = oParkingHour - totalDisTime;
                var discountedFee = fee - totalDisFee;

                if (oPkTime) {
                    var parkingTimeText = discountedParkingHours + " 시간 " + oParkingMinutes + " 분";
                    oPkTime.setText(parkingTimeText);
                } else {
                    MessageBox.error("주차 시간 데이터를 불러오지 못했습니다.");
                }

                if (ofee) {
                    if (typeName === "정기권 차량") {
                        ofee.setNumber(0);
                        oDisFeeId.setNumber(0);
                    } else {
                        ofee.setNumber(discountedFee);
                        if (oDisFeeId) {
                            oDisFeeId.setNumber(totalDisFee);
                        } else {
                            oDisFeeId.setNumber(0);
                        }
                    }
                } else {
                    MessageBox.error("주차 요금 데이터를 불러오지 못했습니다.");
                }

                // myticketModel에 주차 요금과 주차 시간 저장
                if (oMyticketModel) {
                    oMyticketModel.setProperty("/ParkingFee", discountedFee);
                    oMyticketModel.setProperty("/ParkingDisFee",totalDisFee);
                    oMyticketModel.setProperty("/ParkingTime", parkingTimeText);
                }
            }
        },

        //정산 버튼 클릭시 이동
         onPay: function () {
            var oRegisterData = this.getView().getModel("carinfoModel");
            var oMyticketData = this.getView().getModel("myticketModel");
            var carinfoUuid = oRegisterData.Uuid;
            if(!this.oPayDialog){
                this.oPayDialog = this.loadFragment({
                    name: "parking.view.Fragments.Page.PayDialog"
                });
            }
            this.oPayDialog.then(function (oDialog){
                this.oDialog = oDialog;
           
            this.oDialog.open();

            }.bind(this));
         },
        
        //  정산하기 결제 
        onPayTicket: function () {
            debugger;
        var carinfoData = this.getView().getModel("carinfoModel").getData();
        var myticketData = this.getView().getModel("myticketModel").getData();
        var oMainModel = this.getOwnerComponent().getModel();
        var cardetailModel = this.getOwnerComponent().getModel("cardetailData");
        var paymoney = this.byId("PayMoney").getValue();
        
        if (paymoney == carinfoData.ParkingFee) {
            var promises = [];

            if (myticketData.length > 0) {
                myticketData.forEach(function (item) {
                    var oData = {
                        Typeuuid: carinfoData.Typeuuid,
                        NumberPlate: carinfoData.NumberPlate,
                        EntryTime: carinfoData.EntryTime,
                        Discountuuid: item.Discountuuid,
                        UsedCount: item.UsedCount
                    };
                    promises.push(this._getODataCreate(cardetailModel, "/Cardetail", oData));
                }.bind(this));
            } else {
                // myticketData가 없을 때는 carinfoData만 이용하여 저장 처리
                var oData = {
                    Typeuuid: carinfoData.Typeuuid,
                    NumberPlate: carinfoData.NumberPlate,
                    EntryTime: carinfoData.EntryTime
                };
                promises.push(this._getODataCreate(cardetailModel, "/Cardetail", oData));
            }

            $.when.apply($, promises).done(function () {
                MessageBox.success("결제가 완료되었습니다.");
                this.byId("PayMoney").setValue("");
                if (this.oDialog) {
                    this.oDialog.close();
                }
                // Carinfo 데이터 삭제
                this._getODataDelete(oMainModel, "/Carinfo(guid'" + carinfoData.Uuid + "')")
                .done(function() {
                    MessageBox.success("Carinfo 데이터가 성공적으로 삭제되었습니다.");
                    this.navTo("Main");
                }.bind(this))
                .fail(function(oError) {
                    MessageBox.error("Carinfo 데이터 삭제 중 오류가 발생했습니다.");
                    console.error("Carinfo 데이터 삭제 오류:", oError);
                });

                }.bind(this)).fail(function () {
                    MessageBox.error("결제 처리 중 오류가 발생했습니다.");
                });
                } else {
                    MessageBox.information("결제 금액이 맞지 않습니다.");
                    this.byId("PayMoney").setValue("");
                }
            },
        
        // 정산하기 다이얼로그 닫기
        onClosePay: function () {
            var oInputPay = this.byId("PayMoney");

            if(oInputPay){
                oInputPay.setValue("");
            }

            this.oDialog.close();
        },

         // 사용자 화면 이동 버튼 (사용된 할인권 내역 O)
         adminpage : function () {
            this.byId("iconTabBar").setVisible(false);
        },

        // 관리자 화면 이동 버튼 (사용된 할인권 내역 X)
        userpage : function () {
            this.byId("iconTabBar").setVisible(true);
        }
    });
});
