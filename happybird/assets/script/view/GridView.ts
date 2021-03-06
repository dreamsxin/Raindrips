import AudioUtils from "../utils/AudioUtils";
import GameController from "../Controller/GameController";
import { GRID_PIXEL_WIDTH, CELL_WIDTH, CELL_HEIGHT, GRID_PIXEL_HEIGHT } from "../model/constValue";
import CellView from "./CellView";
import CellModel from "../model/CellModel";
import EffectInfo from "../model/EffectInfo";


const { ccclass, property } = cc._decorator;

@ccclass
export default class GridView extends cc.Component {

	@property([cc.Prefab])
	aniPre: cc.Prefab[] = new Array<cc.Prefab>();

	@property(cc.Node)
	effectLayer: cc.Node = null;

	@property(AudioUtils)
	audioUtils: AudioUtils = null;

	lastTouchPos: cc.Vec2 = cc.v2();
	isCanMove: boolean = true;

	controller: GameController = null;
	cellViews: cc.Node[][] = null;

	onLoad() {
		this.setTouchListener();
		this.lastTouchPos = cc.v2(-1, -1);
	}
	onDestroy() {
		this.disableTouchListener();
	}

	setController(controller: GameController) {
		this.controller = controller;
	}

	initWithCellModels(cellsModels: CellModel[][]) {
		this.cellViews = [];
		for (let i = 1; i <= 9; i++) {
			this.cellViews[i] = [];
			for (let j = 1; j <= 9; j++) {
				let type = cellsModels[i][j].type;
				let aniView = cc.instantiate(this.aniPre[type]);
				this.node.addChild(aniView)

				let cellView: CellView = aniView.getComponent('CellView');
				cellView.initWithModel(cellsModels[i][j]);
				this.cellViews[i][j] = aniView;
			}
		}
	}

	setTouchListener() {
		this.node.on(cc.Node.EventType.TOUCH_START, this.touchStart, this);
		this.node.on(cc.Node.EventType.TOUCH_MOVE, this.touchMove, this);
		this.node.on(cc.Node.EventType.TOUCH_END, this.touchEnd, this);
		this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.touchEnd, this);
	}

	disableTouchListener() {
		this.node.off(cc.Node.EventType.TOUCH_START, this.touchStart, this);
		this.node.off(cc.Node.EventType.TOUCH_MOVE, this.touchMove, this);
		this.node.off(cc.Node.EventType.TOUCH_END, this.touchEnd, this);
		this.node.off(cc.Node.EventType.TOUCH_CANCEL, this.touchEnd, this);
	}

	touchStart(event: cc.Event.EventTouch) {
		//?????????????????????????????????
		if (!this.isCanMove) {
			return false;
		}
		let touchPos = event.getLocation();
		let cellPos = this.convertTouchPosToCell(touchPos);
		let changeModels = this.selectCell(cellPos);
		this.isCanMove = changeModels.length < 3;

	}

	touchMove(event: cc.Event.EventTouch) {
		if (!this.isCanMove) {
			return;
		}
		let startTouchPos = event.getStartLocation();
		let startCellPos = this.convertTouchPosToCell(startTouchPos);
		let touchPos = event.getLocation();
		let cellPos = this.convertTouchPosToCell(touchPos);
		if (startCellPos.x != cellPos.x || startCellPos.y != cellPos.y) {
			//this.isCanMove = false;
			let changeModels = this.selectCell(cellPos);
		}
	}

	touchEnd(e: cc.Event.EventTouch) { }

	// ?????????????????????????????????????????????????????????
	convertTouchPosToCell(v2: cc.Vec2) {
		let pos = this.node.convertToNodeSpaceAR(v2);
		if (pos.x < 0 || pos.x >= GRID_PIXEL_WIDTH || pos.y < 0 || pos.y >= GRID_PIXEL_HEIGHT) {
			return cc.v2(-1, -1);
		}
		let x = Math.floor(pos.x / CELL_WIDTH) + 1;
		let y = Math.floor(pos.y / CELL_HEIGHT) + 1;
		return cc.v2(x, y);
	}
	// ????????????
	updateView(changeModels: CellModel[]) {
		let newCellViewInfo = [];
		for (let model of changeModels) {
			//let  = changeModels[i];
			let viewInfo = this.findViewByModel(model);
			let view = null;
			// ???????????????cell?????????????????????
			if (!viewInfo) {
				let type = model.type;
				let aniView = cc.instantiate(this.aniPre[type]);
				this.node.addChild(aniView);
				let cellViewScript = aniView.getComponent("CellView");
				cellViewScript.initWithModel(model);
				view = aniView;
			}
			// ??????????????????
			else {
				view = viewInfo.view;
				this.cellViews[viewInfo.y][viewInfo.x] = null;
			}
			let cellScript = view.getComponent("CellView");
			cellScript.updateView();// ??????????????????
			if (!model.isDeath) {
				newCellViewInfo.push({
					model: model,
					view: view
				});
			}
		}
		// ????????????this.cellviews?????????
		for (let ele of newCellViewInfo) {
			let pos = ele.model.position;
			this.cellViews[pos.y][pos.x] = ele.view;
		}
	}
	// ???????????????????????????
	updateSelect(pos) {
		for (let i = 1; i <= 9; i++) {
			for (let j = 1; j <= 9; j++) {
				if (this.cellViews[i][j]) {
					let cellScript = this.cellViews[i][j].getComponent("CellView");
					if (pos.x == j && pos.y == i) {
						cellScript.setSelect(true);
					}
					else {
						cellScript.setSelect(false);
					}
				}
			}
		}
	}
	/**
	 * ??????cell???model???????????????view
	 */
	findViewByModel(model: CellModel) {
		for (let i = 1; i <= 9; i++) {
			for (let j = 1; j <= 9; j++) {
				if (this.cellViews[i][j] && this.cellViews[i][j].getComponent("CellView").model == model) {
					return { view: this.cellViews[i][j], x: j, y: i };
				}
			}
		}
		return null;
	}
	
	getPlayAniTime(changeModels: CellModel[]) {
		if (!changeModels) {
			return 0;
		}
		let maxTime = 0;

		for (let ele of changeModels) {
			for (let cmd of ele.cmd) {
				if (maxTime < cmd.playTime + cmd.keepTime) {
					maxTime = cmd.playTime + cmd.keepTime;
				}
			}
		}
		return maxTime;
	}
	// ????????????????????? ????????????????????????
	getStep(effectsQueue: EffectInfo[]) {
		if (!effectsQueue) {
			return 0;
		}
		return effectsQueue.reduce((maxValue, efffectCmd) => {
			return Math.max(maxValue, efffectCmd.step || 0);
		}, 0);
	}
	//???????????????????????????
	disableTouch(time: number, step: number) {
		if (time <= 0) {
			return;
		}
		cc.log(time);
		this.isCanMove = false;
		cc.tween(this.node)
			.delay(time)
			.call(() => {
				this.isCanMove = true;
				this.audioUtils.playContinuousMatch(step);
			}).start(); 
	}
	// ??????????????????????????????
	selectCell(cellPos: cc.Vec2) {
		// ???????????????model??????????????????
		let result = this.controller.selectCell(cellPos);
		let changeModels: CellModel[] = result[0]; // ????????????cell,???????????????cell,??????????????????
		let effectsQueue: EffectInfo[] = result[1]; //?????????????????????
		this.playEffect(effectsQueue);

		this.disableTouch(this.getPlayAniTime(changeModels), this.getStep(effectsQueue));
		this.updateView(changeModels);
		this.controller.cleanCmd();
		if (changeModels.length >= 2) {
			this.updateSelect(cc.v2(-1, -1));
			this.audioUtils.playSwap();
		}
		else {
			this.updateSelect(cellPos);
			this.audioUtils.playClick();
		}
		return changeModels;
	}
	playEffect(effectsQueue: EffectInfo[]) {
		this.effectLayer.getComponent("EffectLayer").playEffects(effectsQueue);
	}
}
