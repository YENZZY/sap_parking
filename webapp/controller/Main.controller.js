sap.ui.define([
    "parking/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    'sap/ui/model/Sorter',
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    'sap/ui/core/Fragment',
    "sap/ui/core/dnd/DragInfo",
	"sap/f/dnd/GridDropInfo",
	"parking/RevealGrid/RevealGrid",
	"sap/ui/core/library"
],
function (Controller, JSONModel, MessageBox,Sorter,Filter,FilterOperator,Fragment,DragInfo, GridDropInfo, RevealGrid, coreLibrary) {
    "use strict";

    // shortcut for sap.ui.core.dnd.DropLayout
	var DropLayout = coreLibrary.dnd.DropLayout;

	// shortcut for sap.ui.core.dnd.DropPosition
	var DropPosition = coreLibrary.dnd.DropPosition;

    return Controller.extend("parking.controller.Main", {
        onInit: function () {
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);

            // chart.fragment.xml grid 설정
            this.oGrids();

        },

        _onRouteMatched: function () {
            this._getData();
        },

        _getData: function () {

        var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기
        
        this._getODataRead(oMainModel, "/Carinfo", null, '$expand=to_Ticket').done(

            function(aGetData) {
            
                this.setModel(new JSONModel(aGetData), "entryModel");
                this.oEntryCarCount();
                console.log(aGetData);
            }.bind(this)).fail(function () {

                MessageBox.information("차량 조회를 할 수 없습니다.");

            });

            this.oVipcardata(); //정산된 차량 테이블 데이터 조회
            this.oCardetaildata();
            //this.calculateParkingTime(); // 주차시간 및 요금 계산
        },

        //정산 완료 차량 데이터 조회
        oCardetaildata : function () {
            var oCarDetailModel = this.getOwnerComponent().getModel("cardetailData");
            this._getODataRead(oCarDetailModel,"/Cardetail").done(
                function(aCarGetData) {
                    this.setModel(new JSONModel(aCarGetData),"paidModel");
                }.bind(this)).fail(function () {
                    MessageBox.information("정산 완료 차량 조회를 할 수 없습니다.");
                })
        },

        //정기권 차량 데이터 조회
        oVipcardata : function () {
            var oVipcarModel = this.getOwnerComponent().getModel("vipcarData");
            this._getODataRead(oVipcarModel,"/Vipcar").done(
                function(aVipGetData) {
                    this.setModel(new JSONModel(aVipGetData),"vipcarModel");
                    this.oVipCarCount();
                }.bind(this)).fail(function () {
                    MessageBox.information("정기권 차량 조회를 할 수 없습니다.");
                })
        },

        //입차 차량 수 조회
        oEntryCarCount : function () {
            var oModel = this.getView().getModel("entryModel");
            var entryData = oModel.getData(); 
            var entryCarCount = entryData.length || 0; // 없으면 0
            console.log(entryCarCount);
            
            // 가져온 값을 ObjectNumber에 설정 (chart.fragment에 있음)
            var oObjectNumber = this.byId("entryCarCount");
            oObjectNumber.setNumber(entryCarCount);
        },

        //정기권 차량 수 조회
        oVipCarCount : function () {
            var oModel = this.getView().getModel("vipcarModel");
            var vipCarData = oModel.getData(); 
            var vipCarCount = vipCarData.length || 0; // 없으면 0
            console.log(vipCarCount);
            
            // 가져온 값을 NumericContent에 설정 (chart.fragment에 있음)
            var oObjectNumber = this.byId("vipCarCount");
            oObjectNumber.setNumber(vipCarCount);
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
            oSearch.setValue("");
            }
        },

        //키패드 버튼 클릭시 검색창에 해당 값 띄우기
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
            var oEntryData = this.getView().getModel("entryModel").getData();
            var oSearch = this.byId("findNumber"); // 검색 화면
            var ButtonData = oSearch.getValue();

            // 차량번호가 4자가 아닌 경우
            if (ButtonData.length !== 4) {
                oSearch.setValue("");
                MessageBox.information("차량번호 4자리를 입력해주세요.");
                return;
            }

            if (!this.oTicketDialog) {
                this.oTicketDialog = this.loadFragment({
                    name: "parking.view.Fragments.Main.TicketDialog"
                });
            }

             // 차량번호 필터링
            var oNumberPlate = oEntryData.filter(function(item) {
                return item.NumberPlate === ButtonData;
            });

            if (oNumberPlate.length > 0) {
                var oTData = oNumberPlate[0];
                if (oTData.TypeName === "일반 차량") {
                    this.oTicketDialog.then(function (oTDialog) {
                        this.oTDialog = oTDialog;

                        // 모델 초기화
                        var oRegisterModel = new JSONModel(oTData); // 필터링된 데이터를 모델에 설정
                        this.setModel(oRegisterModel, "registerModel");

                        // var oTicketModel = new JSONModel();
                        // this.setModel(oTicketModel, "ticketModel");

                        // 할인권 데이터 가져오기
                        var oDiscountModel = this.getOwnerComponent().getModel("discountData");
                        this._getODataRead(oDiscountModel, "/Discount")
                            .then(function (aGetData) {
                                this.setModel(new JSONModel(aGetData), "discountModel");
                                this.calculateParkingTime();
                                this.oTDialog.open();
                            }.bind(this))
                            .catch(function () {
                                MessageBox.error("할인권 데이터를 불러올 수 없습니다.");
                            });

                        oSearch.setValue(""); // 검색 필드 초기화
                    }.bind(this));
                } else {
                    oSearch.setValue(""); // 검색 필드 초기화
                    MessageBox.information("정기권이 등록되어있는 차량입니다.");
                }
            } else {
                oSearch.setValue(""); // 검색 필드 초기화
                MessageBox.information("차량번호가 조회되지 않습니다.");
            }
        },

        // 할인권 등록 Dialog (할인권 추가)
        onPlus: function (oEvent) {
            var oColumnListItem = oEvent.getSource().getParent().getParent();
            var oContext = oColumnListItem.getBindingContext("discountModel");
            var sPath = oContext.getPath();
            var oModel = oContext.getModel();
            var usedticket = oModel.getProperty(sPath + "/UsedCount");
            // 1. 행의 셀(테이블 열)들을 배열로 반환 2. 열 : 0,1,2 [2](버튼) 3.해당 열 안의 항목들을 배열로 반환 추가[0], 삭제[1]
            var minusBtn = oColumnListItem.getCells()[2].getItems()[1]; // minusBtn을 다시 활성화 
            if (!usedticket) {
                usedticket = 0;
            }
            usedticket += 1;

            oModel.setProperty(sPath + "/UsedCount", usedticket);

            if(usedticket>0){
                
                minusBtn.setEnabled(true);
            }
        },

        // 할인권 등록 Dialog (할인권 삭제)
        onMinus: function (oEvent) {
            var oColumnListItem = oEvent.getSource().getParent().getParent();
            var oContext = oColumnListItem.getBindingContext("discountModel");
            var sPath = oContext.getPath();
            var oModel = oContext.getModel();
            var usedticket = oModel.getProperty(sPath + "/UsedCount");

            if (!usedticket) {
                usedticket = 0;
            }
            usedticket -= 1;

            if (usedticket < 0) {
                usedticket = 0;
            }

            oModel.setProperty(sPath + "/UsedCount", usedticket);

            var minusBtn = oEvent.getSource();
            if (usedticket <= 0 ) {
                minusBtn.setEnabled(false); // 버튼 비활성화
            } else if(usedticket>0 && !usedticket) {
                minusBtn.setEnabled(true); // 버튼 활성화
            }
        },
       
        // 할인권 등록 버튼
        onBuyTicket: function() {
            var oMainModel = this.getOwnerComponent().getModel();
            var registerData = this.getModel("registerModel").getData();
            var discountData = this.getModel("discountModel").getData();
            var ticketData = registerData.to_Ticket.results;
            console.log("33", ticketData);
            // 필터링된 할인권 데이터 가져오기
            var DiscountData = discountData.filter(function(item) {
                return item.UsedCount && item.UsedCount != 0;
            });
        
            console.log("dis",DiscountData);
            var aPromises = [];
        
             // 필터링된 할인권 데이터에 대해 처리
            DiscountData.forEach(function(item) {
                var existingTicket = ticketData.find(function(ticketItem) {
                    console.log(ticketItem);
                    return ticketItem.Discountuuid === item.Uuid;
                });

                if (existingTicket) {
                    // 기존의 티켓이 있는 경우 업데이트
                    existingTicket.UsedCount += item.UsedCount;
                    var oUpdateData = {
                        UsedCount: existingTicket.UsedCount
                    };
                    aPromises.push(this._getODataUpdate(oMainModel, "/Ticket(Uuid=guid'" + existingTicket.Uuid + "',Parentsuuid=guid'" + registerData.Uuid + "')", oUpdateData));
                } else {
                    // 기존의 티켓이 없는 경우 생성
                    var oCreateData = {
                        Parentsuuid: registerData.Uuid,
                        Discountuuid: item.Uuid,
                        UsedCount: item.UsedCount
                    };
                    aPromises.push(this._getODataCreate(oMainModel, "/Carinfo(guid'" + registerData.Uuid + "')/to_Ticket", oCreateData));
                }
            }.bind(this));
            
            // 모든 Promise를 기다림
            $.when.apply($, aPromises)
                .done(function() {
                    MessageBox.success("할인권 등록이 완료 되었습니다.");
                    if (this.oTDialog) {
                        this.oTDialog.close();
                    }
                }.bind(this))
                .fail(function() {
                    MessageBox.error("할인권 등록을 실패 하였습니다.");
                });
        },
        
        //할인권 등록 다이얼로그 닫기 (다이얼로그가 닫힐 때 버튼 상태 초기화)
        onCloseTicket: function () {
            var oDialog = this.byId("TicketDialog"); 
            var oTable = this.byId("TicketTable"); 

            // 테이블의 각 행에 대해 버튼 상태 초기화
            var aItems = oTable.getItems();
            aItems.forEach(function (oItem) {
                var oPlusBtn = oItem.getCells()[2].getItems()[0]; // 추가 버튼
                var oMinusBtn = oItem.getCells()[2].getItems()[1]; // 삭제 버튼

                if (oPlusBtn) {
                    oPlusBtn.setEnabled(true);
                }

                if (oMinusBtn) {
                    oMinusBtn.setEnabled(true);
                }
            });

            // 다이얼로그 닫기
            oDialog.close();
        },

        //정기권 구매 dialog
        onRegister: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            var oSearch = this.byId("findNumber"); // 검색 화면
            var ButtonData = oSearch.getValue();
            var oNumberPlate = [new Filter("NumberPlate", FilterOperator.EQ, ButtonData)];

            if (!this.oCarDialog) {
                this.oCarDialog = this.loadFragment({
                    name: "parking.view.Fragments.Main.CarDialog"
                });
            }
            
            // 모델 초기화
            var oRegisterModel = new JSONModel();
            this.getView().setModel(oRegisterModel, "registerModel");
        
            this.oCarDialog.then(function (oDialog) {
                this.oDialog = oDialog;
        
                if (ButtonData) {
                    // 차량번호가 입력된 경우 데이터베이스 조회
                    oMainModel.read("/Carinfo", {
                        filters: oNumberPlate,
                        success: function (oData) {
                            if (oData.results && oData.results.length > 0) {
                                var TypeNameMatch = oData.results[0].TypeName;
                                if (TypeNameMatch === "일반 차량") {
                                    oRegisterModel.setData(oData.results[0]); // 첫 번째 결과를 모델에 설정
                                    oSearch.setValue(""); // 검색 필드 초기화
                                    this.carDialogEditable(); // 버튼 및 input박스 활성화 여부
                                    
                                    // 버튼 활성화 및 비활성화
                                    this.byId("saveCar").setVisible(true);
                                    this.byId("removeCar").setVisible(false);
                                    this.oDialog.open();
                                } else {
                                    oSearch.setValue(""); // 검색 필드 초기화
                                    MessageBox.information("이미 정기 차량으로 등록되어 있습니다.");
                                }
                            } else {
                                MessageBox.information("해당하는 차량번호가 없습니다.");
                                oSearch.setValue(""); // 검색 필드 초기화
                            }
                        }.bind(this),
                        error: function () {
                            MessageBox.error("차량번호 4자리를 입력해주세요.");
                            oSearch.setValue(""); // 검색 필드 초기화
                        }
                    });
                } else {
                    // 차량번호가 입력되지 않은 경우 새로운 차량 등록
                    this.carDialogEditableOk(); // 새로운 차량 등록 시 활성화
                    // 버튼 활성화 및 비활성화
                    this.byId("saveCar").setVisible(true);
                    this.byId("removeCar").setVisible(false);
                    this.oDialog.open();
                }
            }.bind(this));
        },        

        // 정기권 차량 등록 취소 
        onRemove: function() {
            var oMainModel = this.getOwnerComponent().getModel();
            var oSearch = this.byId("findNumber"); // 검색 화면
            var ButtonData = oSearch.getValue();
            var oNumberPlate = [new Filter("NumberPlate", FilterOperator.EQ, ButtonData)];

            if (!this.oCarDialog) {
                this.oCarDialog = this.loadFragment({
                    name: "parking.view.Fragments.Main.CarDialog"
                });
            }
            
            // 모델 초기화
            var oRegisterModel = new JSONModel();
            this.getView().setModel(oRegisterModel, "registerModel");
        
            this.oCarDialog.then(function (oDialog) {
                this.oDialog = oDialog;
        
                if (ButtonData) {
                    // 차량번호가 입력된 경우 데이터베이스 조회
                    oMainModel.read("/Carinfo", {
                        filters: oNumberPlate,
                        success: function (oData) {
                            if (oData.results && oData.results.length > 0) {
                                var TypeNameMatch = oData.results[0].TypeName;
                                if (TypeNameMatch === "정기권 차량") {
                                    oRegisterModel.setData(oData.results[0]); // 첫 번째 결과를 모델에 설정
                                    oSearch.setValue(""); // 검색 필드 초기화
                                    this.carDialogEditable(); // 버튼 및 input박스 활성화 여부
                                    
                                    // 버튼 활성화 및 비활성화
                                    this.byId("saveCar").setVisible(false);
                                    this.byId("removeCar").setVisible(true);

                                    this.oDialog.open();
                                } else {
                                    oSearch.setValue(""); // 검색 필드 초기화
                                    MessageBox.information("정기 차량으로 등록되어있지 않습니다.");
                                }
                            } else {
                                MessageBox.information("해당하는 차량번호가 없습니다.");
                                oSearch.setValue(""); // 검색 필드 초기화
                            }
                        }.bind(this),
                        error: function () {
                            MessageBox.error("차량번호 4자리를 입력해주세요.");
                            oSearch.setValue(""); // 검색 필드 초기화
                        }
                    });
                } else {
                    // 차량번호가 입력되지 않은 경우 새로운 차량 등록
                    this.carDialogEditableOk(); // 새로운 차량 등록 시 활성화
                    // 버튼 활성화 및 비활성화
                    this.byId("saveCar").setVisible(false);
                    this.byId("removeCar").setVisible(true);
                    this.oDialog.open();
                }
            }.bind(this));
        },        


        //정기권 차량 등록 다이얼로그 저장
        onSaveCar: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            var oCartypeModel = this.getOwnerComponent().getModel("cartypeData");
            var oVipcarModel = this.getOwnerComponent().getModel("vipcarData");
            var oRegisterModel = this.getModel("registerModel");
            var saveCarData = oRegisterModel.getData();
        
            var oCarTypeFilter = [new Filter("TypeName", FilterOperator.EQ, "정기권 차량")];

            // 차량번호 길이 확인
            if (!saveCarData.NumberPlate || saveCarData.NumberPlate.length !== 4) {
                MessageBox.error("차량번호를 4자리 입력해주세요.");
                return;
            }

            if(saveCarData.Uuid){
            //차량구분 typeUUid(일반차량->정기권 차량) 업데이트
            oCartypeModel.read("/Cartype", {
                filters: oCarTypeFilter,
                success: function (oData) {
                    if (oData && oData.results && oData.results.length > 0) {
                        var typeUuid = oData.results[0].Uuid;
                     
                        var updateData = {
                            Typeuuid: typeUuid
                        };
                        this._getODataUpdate(oMainModel, "/Carinfo(guid'" + saveCarData.Uuid + "')", updateData).done(function () { //Cartype(guid'112225ef-817e-1edf-8e89-372183f580f3')
                        
                        // 정기권 차량 테이블에 등록
                        oVipcarModel.create("/Vipcar",{
                        NumberPlate : saveCarData.NumberPlate,
                       });

                            MessageBox.success("차량 정보가 성공적으로 업데이트되었습니다.");
                            this.oDialog.close();

                        // registerModel 재실행(갱신)
                        this._getData();

                        }.bind(this)).fail(function () {
                            MessageBox.error("차량 정보 업데이트 중 오류가 발생했습니다.");
                        });
                    } else {
                        MessageBox.error("정기권 차량 유형을 찾을 수 없습니다.");
                    }
                }.bind(this),
                error: function () {
                    MessageBox.error("차량 유형 조회 중 오류가 발생했습니다.");
                }
            });
            // 신규 생성
        } else {
            // 정기권 차량 테이블에 등록
            oVipcarModel.create("/Vipcar", {
                NumberPlate: saveCarData.NumberPlate
            }, {
                success: function () {
                    MessageBox.success("차량 정보가 성공적으로 업데이트되었습니다.");
                    this.oDialog.close();
                    // vipcarModel 재실행(갱신)
                    this._getData();
                }.bind(this),
                    error: function (oError) {
                        // 오류 응답 처리
                        var oMessage = JSON.parse(oError.responseText);
                        if (oMessage.error && oMessage.error.message) {
                            MessageBox.error(oMessage.error.message.value);
                            this.oDialog.close();
                        } else {
                            MessageBox.error("차량 정보 업데이트 중 오류가 발생했습니다.");
                        }
                    }.bind(this)
                });
            }
        },
        
        //정기권 차량 등록 다이얼로그 닫기
        onCloseCar: function () {
            // 다이얼로그가 닫힐 때 입력 필드의 값을 초기화
            var oTypeName = this.byId("SelTypeName");
            var oNumberPlate = this.byId("inputNumberPlate");
        
            if (oTypeName) {
                oTypeName.setSelectedKey(""); // Select의 선택된 키 초기화
            }
            if (oNumberPlate) {
                oNumberPlate.setValue(""); // Input 필드의 값 초기화
            }

            this.oDialog.close();
        },
        // 주차요금 계산하기 (할인 쿠폰 적용)
        calculateParkingTime: function () {
            var oRegisterModel = this.getView().getModel("registerModel");
            // var oticketModel = this.getView().getModel("ticketModel");

            if (!oRegisterModel) {
                MessageBox.error("registerModel을 찾을 수 없습니다.");
                return;
            }

            var entryTime = oRegisterModel.getProperty("/EntryTime");
            var typeName = oRegisterModel.getProperty("/TypeName");

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

                if (oRegisterModel && oRegisterModel.getProperty("/").length) {
                    oRegisterModel.getProperty("/").forEach(function (item) {
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
                if (oRegisterModel) {
                    oRegisterModel.setProperty("/ParkingFee", discountedFee);
                    oRegisterModel.setProperty("/ParkingDisFee",totalDisFee);
                    oRegisterModel.setProperty("/ParkingTime", parkingTimeText);
                }
            }
        },

        // 정산 차량 테이블 sort
        onSort: function () {
			this.getViewSettingsDialog("parking.view.Fragments.sortDialog")
				.then(function (osortDialog) {
					osortDialog.open();
				});
		},
        handleSortDialogConfirm: function (oEvent) {
			var oTable = this.byId("EntryCarTable"),
				mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath,
				bDescending,
				aSorters = [];

			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));

			// apply the selected sort and group settings
			oBinding.sort(aSorters);
		},

        // 정기권 등록 Dialog (신규 등록 / 입차 X)
        carDialogEditableOk: function () {
            this.byId("inputTypeName").setVisible(false);
            this.byId("inputNumberPlate").setEditable(true);
        },

        // 정기권 등록 Dialog (입차 차량)
        carDialogEditable: function () {
            this.byId("inputTypeName").setVisible(true);
            this.byId("inputNumberPlate").setEditable(false);
        },

        // 사용자 화면 이동 버튼
        onUser: function () {
            this.byId("buyBtn").setVisible(false);
            this.byId("registerBtn").setVisible(false);
            this.byId("removeBtn").setVisible(false);
            this.byId("buyBtn").setVisible(false);
            this.byId("ChartItem").setVisible(false);
            this.byId("entryCar").setVisible(false);
            this.byId("ticketCar").setVisible(false);
            this.byId("Admin").setVisible(true);
            this.byId("User").setVisible(false);
        },

        // 관리자 화면 이동 버튼
        onAdmin: function () {
            this.byId("buyBtn").setVisible(true);
            this.byId("registerBtn").setVisible(true);
            this.byId("removeBtn").setVisible(true);
            this.byId("ChartItem").setVisible(true);
            this.byId("entryCar").setVisible(true);
            this.byId("ticketCar").setVisible(true);
            this.byId("Admin").setVisible(false);
            this.byId("User").setVisible(true);
        },

        // 그리드 컨테이너
        oGrids: function () {
            var oGrid = this.byId("gridCar");

            oGrid.addDragDropConfig(new DragInfo({
                sourceAggregation: "items"
            }));
    
            oGrid.addDragDropConfig(new GridDropInfo({
                targetAggregation: "items",
                dropPosition: DropPosition.Between,
                dropLayout: DropLayout.Horizontal,
                drop: function (oInfo) {
                    var oDragged = oInfo.getParameter("draggedControl"),
                        oDropped = oInfo.getParameter("droppedControl"),
                        sInsertPosition = oInfo.getParameter("dropPosition"),
                        iDragPosition = oGrid.indexOfItem(oDragged),
                        iDropPosition = oGrid.indexOfItem(oDropped);
    
                    oGrid.removeItem(oDragged);
    
                    if (iDragPosition < iDropPosition) {
                        iDropPosition--;
                    }
    
                    if (sInsertPosition === "After") {
                        iDropPosition++;
                    }
    
                    oGrid.insertItem(oDragged, iDropPosition);
                    oGrid.focusItem(iDropPosition);
                }
            })); 
        }
    });
});
