import DataManager from "../model/DataManager";
import { State } from "./Background";

const { ccclass, property } = cc._decorator;

@ccclass
class GameScene extends cc.Component {

	@property(cc.Node)
	ballPanel: cc.Node = null

	@property(cc.Prefab)
	smallBallPrefab: cc.Prefab = null

	@property(cc.Prefab)
	bulletNode: cc.Prefab = null

	@property(cc.Node)
	bigBall: cc.Node = null

	@property(cc.Label)
	levelLabel: cc.Label = null

	@property(cc.Node)
	bgNode: cc.Node = null

	@property(cc.JsonAsset)
	jsonData: cc.JsonAsset = null

	smallBalls: cc.Node[] = []
	tmpBalls: cc.Node[] = []
	curLevel: number;

	private _gameStart: boolean = null;

	private dataManager: DataManager = null;

	onLoad() {
		this.init();
		this.node.on('gameover', this.gameover, this);
	}

	init() {
		this.smallBalls = [];
		this.tmpBalls = [];         // 发射的尚未添加到大球上的小球
		this._gameStart = false;

		this.dataManager = new DataManager(this.jsonData.json);
		this.curLevel = this.dataManager.getUserData().currentLevel;
	}

	start() {
		this.loadLevel(this.curLevel);
		this.startGame();
	}

	startGame() {
		this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
	}

	gameover() {
		if (!this._gameStart) {
			return;
		}
		this._gameStart = false;
		
		this.bigBall.emit('gameover');
		this.bgNode.emit('setState',State.GameOver);
		this.scheduleOnce(() => {
			this.loadLevel(this.curLevel);
		}, 2);
	}

	loadLevel(l: number) {
		this.dataManager.loadLevel(l);
		let data = this.dataManager.getLevelData();
		let dir = data.dir == 0 ? (Math.random() < 0.5 ? 1 : -1) : data.dir;
		this.bigBall.emit('setDir', dir, data.speed);

		this.levelLabel.string = "第 " + (l + 1) + " 关";

		// 清空数据
		for (let b of this.tmpBalls) {
			b.destroy();
		}
		for (let b of this.smallBalls) {
			b.destroy();
		}
		this.tmpBalls.length = 0;
		this.smallBalls.length = 0;

		//循环生成球
		for (let i = 0; i < data.smallNum; i++) {
			let ball = cc.instantiate(this.bulletNode);
			ball.parent = this.ballPanel;
			this.smallBalls.push(ball);
			ball.getComponentInChildren(cc.Label).string = (data.smallNum - i).toString();
		}

		this.bgNode.emit('setState',State.StartGame)
		this.loadBigBall(data.bigNum);


		this._gameStart = true;
	}

	loadBigBall(counts: number) {
		this.bigBall.destroyAllChildren();
		let radius = this.bigBall.width / 2 - 2;
		let degree = 360 / counts;
		for (let i = 0; i < counts; i++) {
			let ball = cc.instantiate(this.smallBallPrefab);
			let radian = cc.misc.degreesToRadians(i * degree);
			let x = radius * Math.sin(radian);
			let y = radius * Math.cos(radian);
			ball.x = x;
			ball.y = y;
			ball.parent = this.bigBall;
			// // 计算旋转角度
			ball.angle = 180 - i * degree;
			ball.emit('setText', 0);
		}
	}  

	onTouchStart(event: cc.Event) {
		//游戏还没开始
		if (!this._gameStart) {
			return;
		}
		//没有发射的球了
		if (this.smallBalls.length <= 0) {
			return;
		}
		this.emitPin();
	}

	//发射针
	emitPin() {
		let bullet = this.smallBalls.shift();
		let wordPos = bullet.parent.convertToWorldSpaceAR(bullet.position);

		let ball = cc.instantiate(this.smallBallPrefab);
		ball.getComponentInChildren(cc.Label).string = bullet.getComponentInChildren(cc.Label).string;
		ball.parent = this.bigBall.parent;
		ball.position = cc.v3(this.bigBall.parent.convertToNodeSpaceAR(wordPos));
		this.tmpBalls.push(ball);
		bullet.destroy();

		//发射小球
		let radius = this.bigBall.height / 2;
		let des = cc.v3(0, this.bigBall.y - radius);
		cc.tween(ball)
			.to(0.05, { position: des })
			.call(() => {
				this.tmpBalls.shift();
				ball.parent = this.bigBall;
				let angle = this.bigBall.angle % 360 + 180;
				let radian = cc.misc.degreesToRadians(angle);

				let x = radius * Math.sin(radian);
				let y = radius * Math.cos(radian);
				ball.x = x;
				ball.y = y;
				ball.angle = 180 - angle;

				this.scheduleOnce(this._checkPass.bind(this), 0);
			}).start();
	}


	//检查是否通过
	_checkPass() {
		if (this._gameStart && this.smallBalls.length == 0) {
			this._gameStart = false;
			
			
			this.bgNode.emit('setState',State.NextLevel);
			let des = "恭喜过关，即将进入下一关";
			//const max = zy.dataMng.levelData.getMaxLevel();
			const max = 10;
			if (this.curLevel < max) {
				this.curLevel += 1;
			} else {
				des = "恭喜你通关了";
			}
			//zy.ui.tip.show(des);
			this.scheduleOnce(() => {
				this.loadLevel(this.curLevel);
			}, 2);
			this.dataManager.userData.currentLevel=this.curLevel;
			this.dataManager.saveUserData();
		}
	}
}
