import Piece from './Piece'
const { ccclass, property } = cc._decorator;

enum Dir {
	up = 0,
	down,
	left,
	right,
	null
}

@ccclass
export default class Board extends cc.Component {
	@property(cc.Prefab)
	piecePrefab: cc.Prefab = null;

	@property(cc.Texture2D)
	texture: cc.Texture2D = null

	@property
	num: number = 3;

	private pieceMap: cc.Node[][];

	private blankPiece: cc.Node = null;
	private Size: number = 0;

	private isCanMove;

	onLoad() {
		this.node.on('touch', this.touch, this);
		this.init();
	}


	init(num?:number) {
		if(num){
			this.num=num;
		}
		this.Size = this.node.width / this.num;
		this.pieceMap = [];
		for (let i = 0; i < this.num; i++) {
			this.pieceMap[i] = [];
			for (let j = 0; j < this.num; j++) {

				let node = cc.instantiate(this.piecePrefab);
				node.parent = this.node;
				this.pieceMap[i][j] = node;

				node.width = this.node.width / this.num;
				node.height = this.node.height / this.num;
				node.position = this.indexToPos(j, i);

				let piece: Piece = node.getComponent('Piece');
				let picSize = this.texture.width / this.num;
				let rect = cc.rect(j * picSize, i * picSize, picSize, picSize);
				piece.init(new cc.SpriteFrame(this.texture, rect));
				piece.IsBlank = false;
			}
		}
		this.blankPiece = this.pieceMap[this.num - 1][this.num - 1];
		this.blankPiece.getComponent('Piece').IsBlank = true;
		
		this.shuffle();
	}

	shuffle() {
		this.isCanMove=true;
		this.schedule(() => {
			let dir: Dir = Math.random() * 4 | 0;
			this.moveDir(dir);
			if(this.isCanMove==300){
				this.isCanMove=true;
			}
		}, 0.01, 300);
	}

	indexToPos(x: number, y: number): cc.Vec3 {
		return cc.v3(x * this.Size, y * this.Size);
	}

	posToIndex(v3: cc.Vec3) {
		let x = v3.x / this.Size | 0;
		let y = v3.y / this.Size | 0;
		return cc.v2(x, y);
	}

	moveDir(dir: Dir) {
		this.findBlank();
		let pos = this.posToIndex(this.blankPiece.position);

		let X = pos.x;
		let Y = pos.y;

		switch (dir) {
			case Dir.up:
				cc.log('up')
				Y++;
				break;
			case Dir.down:
				cc.log('down')
				Y--;
				break;
			case Dir.left:
				cc.log('left')
				X--;
				break;
			case Dir.right:
				cc.log('right')
				X++;
				break;
		}
		if (this.inAear(X, Y) && !(X == pos.x && Y == pos.y)) {
			cc.log(pos + ' ' + X + ' ' + Y);
			this.swapNode(cc.v2(X, Y), cc.v2(pos.x, pos.y));
			//this.blankPiece = this.pieceMap[Y][X];
		}
	}

	findBlank() {
		for (let i = 0; i < this.num; i++) {
			for (let j = 0; j < this.num; j++) {
				let piece: Piece = this.pieceMap[i][j].getComponent('Piece');
				if (piece.IsBlank) {
					this.blankPiece = this.pieceMap[i][j];
					cc.log('find' + j + ' ' + i)
					return;
				}
			}
		}
	}

	inAear(x: number, y: number) {
		return !(x < 0 || x >= this.num || y < 0 || y >= this.num);
	}

	swapNode(v1: cc.Vec2, v2: cc.Vec2) {

		let node1 = this.pieceMap[v1.y][v1.x];
		let node2 = this.pieceMap[v2.y][v2.x];

		let pos1 = node1.position;
		let pos2 = node2.position;

		this.pieceMap[v1.y][v1.x].position = pos2
		this.pieceMap[v1.y][v1.x] = node2;


		this.pieceMap[v2.y][v2.x].position = pos1;
		this.pieceMap[v2.y][v2.x] = node1;
	}

	findDir(x, y): Dir {
		//?????????
		const dir = [		
			[0, -1],			//???
			[0, 1],				//???
			[1, 0],				//???
			[-1, 0],			//???
		];
		for (let i = 0; i < 4; i++) {
			let X = dir[i][0] + x;
			let Y = dir[i][1] + y;

			if (this.inAear(X, Y)
				&& this.pieceMap[Y][X].getComponent('Piece').IsBlank) {
				return i as Dir;
			}
		}
		return Dir.null;
	}

	touch(node: cc.Node) {
		if(!this.isCanMove){
			return;
		}
		let index = this.posToIndex(node.position);
		let dir= this.findDir(index.x,index.y);
		this.moveDir(dir);
	}

	// update (dt) {}
}
