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
        
        this._getODataRead(oMainModel, "/Carinfo").done(

            function(aGetData) {
            
                this.setModel(new JSONModel(aGetData), "paidModel");
            
            }.bind(this)).fail(function () {

                MessageBox.information("지점 조회를 할 수 없습니다.");

            });

            this.oVipcardata();
        },

        //정산권 차량 데이터 조회
        oVipcardata : function () {
            var oVipcarModel = this.getOwnerComponent().getModel("vipcarData");
            this._getODataRead(oVipcarModel,"/Vipcar").done(
                function(aVipGetData) {
                    this.setModel(new JSONModel(aVipGetData),"vipcarModel");
                }.bind(this)).fail(function () {
                    MessageBox.information("정기권 차량 조회를 할 수 없습니다.");
                })
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

        // 할인권 구매 dialog 할인권 추가 버튼
        // onAddDiscount: function() {
        //     var oVBox = this.byId("discountContainer");

        //     Fragment.load({
        //         id: this.createId("discountItem" + oVBox.getItems().length),
        //         name: "parking.view.Fragments.Page.AddTicket",
        //         controller: this
        //     }).then(function(oFragment) {
        //         // Assuming oFragment is a container (e.g., VBox or HBox)
        //         var oForm = this.byId("ticketForm");
        //         oFragment.getItems().forEach(function(oItem) {
        //             oForm.addContent(oItem);
        //         });
        //     }.bind(this)).catch(function(oError) {
        //         console.error("Error loading fragment:", oError);
        //     });
        // },
        
        //할인권 구매 버튼 클릭시 이동
        onBuy: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            var oSearch = this.byId("findNumber"); // 검색 화면
            var ButtonData = oSearch.getValue();
            var oNumberPlate = [new Filter("NumberPlate", FilterOperator.EQ, ButtonData)];
            
            if (!this.oTicketDialog) {
				this.oTicketDialog = this.loadFragment({
					name: "parking.view.Fragments.TicketDialog"
				});
            }
                this.oTicketDialog.then(function (oTDialog) {
                    this.oTDialog = oTDialog;
                
                // 모델 초기화
                var oRegisterModel = new JSONModel();
                this.setModel(oRegisterModel, "registerModel");

                var oTicketModel = new JSONModel();
                this.setModel(oTicketModel, "ticketModel");
                this.oTDialog.open();
                // // 할인권 데이터 가져오기
                // var oDiscountModel = this.getOwnerComponent().getModel("discountData");
                // this._getODataRead(oDiscountModel, "/Discount")
                //     .then(function (aGetData) {
                //         // Select 컨트롤에 바인딩된 모델 설정
                //         var oSelect = this.byId("selTicketName");
                //         oSelect.setModel(new JSONModel(aGetData), "discountModel");
                //         console.log("agetdata", aGetData);
                //     }.bind(this))
                //     .catch(function () {
                //         MessageBox.error("할인권 데이터를 불러올 수 없습니다.");
                //     });

                // // 차량번호 불러오기
                // oMainModel.read("/Carinfo", {
                //     filters: oNumberPlate,
                //     success: function (oTData) {
                //         console.log(oTData);
                //         if (oTData.results && oTData.results.length > 0) {
                //             var TypeNameMatch = oTData.results[0].TypeName;
                //             if (TypeNameMatch === "일반 차량") {
                //                 oRegisterModel.setData(oTData.results[0]); // 첫 번째 결과를 모델에 설정
                //                 oSearch.setValue(""); // 검색 필드 초기화
                //                 this.oTDialog.open();
                //             } else {
                //                 oSearch.setValue(""); // 검색 필드 초기화
                //                 MessageBox.information("정기권이 등록되어있는 차량입니다.");
                //             }
                //         } else {
                //             MessageBox.information("차량번호가 조회되지 않습니다.");
                //             oSearch.setValue(""); // 검색 필드 초기화
                //             this.oTDialog.close();
                //         }
                //     }.bind(this),
                //     error: function () {
                //         MessageBox.error("해당하는 차량번호가 없습니다.");
                //         oSearch.setValue(""); // 검색 필드 초기화
                //     }
                //});
			}.bind(this));
    },
        
         // 할인권 선택 임시 저장
         onSaveTicket: function () {
            var oTicketModel = this.getModel("ticketModel"); 
            var aTicketData = oTicketModel.getData().tickets || []; // tickets 배열로 초기화
            var plusCount = parseInt(this.byId("plusTicket").getValue(), 10); // 추가할 할인권 개수
            var sDiscountUuid = this.getModel("ticketModel").getProperty("/Discountuuid");
            var sParentsuuid = this.getModel("registerModel").getProperty("/Uuid");
            
            // 배열에서 기존 항목 찾기
            var oExistingTicket = aTicketData.find(function(ticket) {
                return ticket.Discountuuid === sDiscountUuid;
            });
        
            if (oExistingTicket) {
                // 기존 항목이 있다면 TotalCount 업데이트
                oExistingTicket.TotalCount += plusCount;
            } else {
                // 기존 항목이 없다면 새 항목 추가
                aTicketData.push({
                    Discountuuid: sDiscountUuid,
                    TotalCount: plusCount,
                    Parentsuuid : sParentsuuid
                });
            }
           
            // 데이터 모델 업데이트
            oTicketModel.setData({
                tickets: aTicketData
            });
            console.log(aTicketData);

             // 화면에 표시할 데이터 설정
            // this.updateTicketText(sDiscountUuid);
            
            // plusTicket input 박스 초기화
            this.byId("plusTicket").setValue(""); 
                    
    }, 

    // updateTicketText: function (sDiscountUuid) {
    //     var oTicketModel = this.getModel("ticketModel");
    //     var aTicketData = oTicketModel.getData().tickets || [];
    //     var oSelectedTicket = aTicketData.find(function(ticket) {
    //         return ticket.Discountuuid === sDiscountUuid;
    //     });
    
    //     if (oSelectedTicket) {
    //         this.byId("displayDiscountUuid").setText(oSelectedTicket.Discountuuid);
    //         this.byId("displayTotalCount").setText(oSelectedTicket.TotalCount.toString());
    //     }
    // },

        //select 할인권 변경시 티켓 개수 데이터 변경 
        onSelTicketChange: function (oEvent) {
            // var sSelectedKey = oEvent.getSource().getSelectedKey();
            // var oTicketModel = this.getModel("ticketModel");
            // var oDiscountModel = this.getModel("discountModel");
        
            // if (!oDiscountModel) {
            //     MessageBox.error("할인권 데이터를 불러올 수 없습니다.");
            //     return;
            // }
        
            // var oDiscountData = oDiscountModel.getData();
            // var oSelectedTicket = oDiscountData.find(function (ticket) {
            //     return ticket.Uuid === sSelectedKey;
            // });
        
            // if (oSelectedTicket) {
            //     // 티켓 데이터 소스에서 TotalCount 가져오기
            //     var oTicketSourceModel = this.getOwnerComponent().getModel("ticketSourceData");
            //     this._getODataRead(oTicketSourceModel, "/TicketData")
            //         .then(function (aTicketData) {
            //             var oTicket = aTicketData.results.find(function (ticket) {
            //                 return ticket.Discountuuid === sSelectedKey;
            //             });
        
            //             var totalCount = oTicket ? oTicket.TotalCount : 0;
        
            //             oTicketModel.setData({
            //                 Discountuuid: oSelectedTicket.Uuid,
            //                 TotalCount: totalCount
            //             });
        
            //             // 추가 입력 창 초기화
            //             this.byId("plusTicket").setValue("");
            //         }.bind(this))
            //         .catch(function () {
            //             MessageBox.error("티켓 데이터를 불러올 수 없습니다.");
            //         });
            // } else {
            //     // 만약 선택한 티켓을 찾지 못했다면 기본 값 설정 또는 에러 처리
            //     oTicketModel.setData({
            //         Discountuuid: "",
            //         TotalCount: 0
            //     });
            // }
        },
               
        onBuyTicket: function() {
            var oMainModel = this.getOwnerComponent().getModel();
            var ticketData = this.getModel("ticketModel").getData().tickets;
            var registerData = this.getModel("registerModel").getData();
            console.log(registerData);
            var carinfoNumberPlate = registerData.NumberPlate;
            var oNumberPlate = [new Filter("NumberPlate", FilterOperator.EQ, carinfoNumberPlate)];
             oMainModel.read("/Carinfo", {
                filters: oNumberPlate,
                success: function(oData) {
                    console.log("odata",oData);
                    if (oData.results.length > 0) {
                        var oCarinfoData = oData.results[0];
                        var carinfoUuid = oCarinfoData.Uuid;
                        console.log(oCarinfoData)
                        ticketData.forEach(function(item) {
                            var newUri = "/Carinfo(guid'" + carinfoUuid + "')/to_Ticket";
                            console.log("item",item);
                            console.log("newUri",newUri);
                            this._getODataUpdate(oMainModel, newUri, item).done(function(aReturn) {
                                // 성공 시 처리할 코드
                            }.bind(this)).fail(function(err) {
                                // 실패 시 처리할 코드
                            }).always(function() {
                                // 항상 실행될 코드
                            });
                        }.bind(this));

                        this.navTo("Main", {});
                    }
                }.bind(this),
                    error: function(oError) {
                    // 오류 처리
                    }
                });
            },
            // var registerUri = registerData.__metadata.uri;
            // var startIndex = registerUri.indexOf("/Carinfo");
            // var extractedUri = registerUri.substring(startIndex);
            // var param = extractedUri;
            // console.log(param);
            // this._getODataUpdate(oMainModel, param, registerData).done(function(aReturn) {
               
            //     ticketData.forEach(item => {
            //          //   item.Parentsuuid = registerData.Uuid;
            //             var newUri = param + "/to_Ticket";
            //             this._getODataCreate(oMainModel, newUri, item).done(function(aReturn) {   
            //                 // 성공 시 처리할 코드
            //             }.bind(this)).fail(function(err) {
            //                 // 실패 시 처리할 코드
            //             }).always(function() {
            //                 // 항상 실행될 코드
            //             });
            //         });
            //     }.bind(this));
            //},
           
        
        //할인권 구매 다이얼로그 닫기
        onCloseTicket: function (){
            
            // 다이얼로그가 닫힐 때 입력 필드의 값을 초기화
            var oNumberPlate = this.byId("inputNumberPlate");
        
            
            if (oNumberPlate) {
                oNumberPlate.setValue(""); // Input 필드의 값 초기화
            }
           
            this.oTDialog.close();
            
        },

        //정기권 구매 dialog
        onRegister: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            var oSearch = this.byId("findNumber"); // 검색 화면
            var ButtonData = oSearch.getValue();
            var oNumberPlate = [new Filter("NumberPlate", FilterOperator.EQ, ButtonData)];
        
            if (!this.oCarDialog) {
                this.oCarDialog = this.loadFragment({
                    name: "parking.view.Fragments.CarDialog"
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
                                    this.oDialog.open();
                                } else {
                                    oSearch.setValue(""); // 검색 필드 초기화
                                    MessageBox.information("정기권이 등록되어있는 차량입니다.");
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
             oVipcarModel.create("/Vipcar",{
                NumberPlate : saveCarData.NumberPlate,
               });
               MessageBox.success("차량 정보가 성공적으로 업데이트되었습니다.");
                this.oDialog.close();
                // vipcarModel 재실행(갱신)
                this._getData();
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
        
        // 정산 차량 테이블 sort
        onSort: function () {
			this.getViewSettingsDialog("parking.view.Fragments.sortDialog")
				.then(function (osortDialog) {
					osortDialog.open();
				});
		},
        handleSortDialogConfirm: function (oEvent) {
			var oTable = this.byId("CompleteTable"),
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

    carDialogEditableOk: function () {
        this.byId("inputTypeName").setVisible(false);
        this.byId("inputNumberPlate").setEditable(true);
    },

    carDialogEditable: function () {
        this.byId("inputTypeName").setVisible(true);
        this.byId("inputNumberPlate").setEditable(false);
    },

    oGrids: function () {
        var oGrid = this.byId("grid1");


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
    
            oGrid.attachLayoutChange(function (oEvent) {
                var sLayout = oEvent.getParameter("layout");
    
                if (sLayout === "layoutXS" || sLayout === "layoutS") {
                    oGrid.removeStyleClass("sapUiSmallMargin");
                    oGrid.addStyleClass("sapUiTinyMargin");
                } else {
                    oGrid.removeStyleClass("sapUiTinyMargin");
                    oGrid.addStyleClass("sapUiSmallMargin");
                }
            });    
    }

       
    // onRevealGrid: function () {
    //     RevealGrid.toggle("grid1", this.getView());
    // },

    // onExit: function () {
    //     RevealGrid.destroy("grid1", this.getView());
    // }
    });
});
