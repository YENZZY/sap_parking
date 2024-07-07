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
                    this.setModel(oCarinfoModel,"carinfoModel");
                    this.calculateParkingTime();
                }.bind(this), error: function () {
                    MessageBox.information("carinfoModel 조회를 할 수 없습니다.");
                }
            });

            oMainModel.read(ticketPath, {
                success: function (oData2) {
                    console.log(oData2);
                    var oMyTicketModel = new JSONModel(oData2.results);
                    this.setModel(oMyTicketModel,"myticketModel");
                }.bind(this), error: function () {
                    MessageBox.information("myticketModel 조회를 할 수 없습니다.");
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
            var typeName = oCarinfoModel.getProperty("/TypeName");

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
                    if(typeName==="정기권 차량"){

                        ofee.setValue("요금 : " + 0 + " 원");

                    } else {

                    ofee.setValue("요금 : " + fee + " 원");

                    }
                } else {
                
                    MessageBox.error("주차 요금 데이터를 불러오지 못했습니다.");
                
                }
            }
        },

        // 할인권 +
        onPlus: function () {
            var oTable = this.byId("myticketTable"); // 테이블 객체 가져오기
            var aSelectedIndex = oTable.getSelectedIndex(); // 선택된 행 인덱스 가져오기
        
            if (aSelectedIndex === -1) {
                MessageBox.error("할인권을 선택해주세요.");
                return;
            }
        
            var oMyticketModel = this.getView().getModel("myticketModel"); // 모델 가져오기
            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기
            var oMyticketData = oMyticketModel.getData(); // 모델 데이터 가져오기
        
            var oRowData = oMyticketData[aSelectedIndex]; // 선택된 행 데이터 가져오기
        
            if (oRowData.TotalCount > 0) {
                oRowData.TotalCount--; // 남은 개수 감소
                oRowData.UsedCount++; // 사용된 개수 증가
        
                // UI에서 판매 버튼 비활성화
                if (oRowData.TotalCount === 0) {
                    var oButton = this.byId("onPlus"); // Plus 버튼 가져오기
                    oButton.setEnabled(false); // 버튼 비활성화
                }
        
                // Item 엔티티 업데이트
                this.updateItem(oMainModel, oRowData.Uuid, oRowData.Parentsuuid, oRowData.TotalCount, oRowData.UsedCount)
                    .then(function() {
                        // 업데이트 성공 시 처리
                        MessageBox.success("선택된 할인권이 판매 처리되었습니다.");
                    })
                    .catch(function(err) {
                        // 업데이트 실패 시 처리
                        MessageBox.error("할인권 업데이트에 실패하였습니다.");
                    })
                    .finally(function() {
                        // 모든 데이터 업데이트 후, UI 모델 다시 설정
                        oMyticketModel.setData(oMyticketData);
                    });
            }

        },
        // 할인권 -
        onMinus: function() {
            var oTable = this.byId("myticketTable"); // 테이블 객체 가져오기
            var aSelectedIndex = oTable.getSelectedIndex(); // 선택된 행 인덱스 가져오기
        
            if (aSelectedIndex === -1) {
                MessageBox.error("할인권을 선택해주세요.");
                return;
            }
        
            var oMyticketModel = this.getView().getModel("myticketModel"); // 모델 가져오기
            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기
            var oMyticketData = oMyticketModel.getData(); // 모델 데이터 가져오기
        
            var oRowData = oMyticketData[aSelectedIndex]; // 선택된 행 데이터 가져오기
        
            if (oRowData.TotalCount > 0) {
                oRowData.TotalCount -= 1; // 남은 개수 감소
                oRowData.UsedCount += 1; // 사용된 개수 증가
        
                // UI에서 판매 버튼 비활성화
                if (oRowData.TotalCount === 0) {
                    var oButton = this.byId("onPlus"); // Plus 버튼 가져오기
                    oButton.setEnabled(false); // 버튼 비활성화
                }
        
                // Item 엔티티 업데이트
                this.updateItem(oMainModel, oRowData.Uuid, oRowData.Parentsuuid, oRowData.TotalCount, oRowData.UsedCount)
                    .then(function() {
                        // 업데이트 성공 시 처리
                        MessageBox.success("선택된 할인권이 판매 처리되었습니다.");
                    })
                    .catch(function(err) {
                        // 업데이트 실패 시 처리
                        MessageBox.error("할인권 업데이트에 실패하였습니다.");
                    })
                    .finally(function() {
                        // 모든 데이터 업데이트 후, UI 모델 다시 설정
                        oMyticketModel.setData(oMyticketData);
                    });
            }
        },
        
        // Item 엔티티 업데이트 함수
        updateItem: function(oMainModel, Uuid, Parentsuuid, TotalCount, UsedCount) {
            var itemPath = "/Ticket(Uuid=guid'" + Uuid + "', Parentsuuid=guid'" + Parentsuuid + "')";
            var oItemData = {
                Uuid: Uuid,
                Parentsuuid: Parentsuuid,
                TotalCount: TotalCount,
                UsedCount: UsedCount
            };
        
            return new Promise(function(resolve, reject) {
                oMainModel.update(itemPath, oItemData, {
                    success: function(oData) {
                        resolve(oData);
                    },
                    error: function(err) {
                        reject(err);
                    }
                });
            });
        },

        //정산 버튼 클릭시 이동
        onPay: function () {

        }
    });
});
