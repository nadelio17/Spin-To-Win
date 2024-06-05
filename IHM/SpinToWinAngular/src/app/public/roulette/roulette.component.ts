import { Component, OnInit, ViewChild, ElementRef, Renderer2, AfterViewInit, OnDestroy, SimpleChanges } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { PlayoutComponent } from "../playout/playout.component";
import { WebSocketService } from '../web-socket.service';  // Importez le service WebSocket
import { Subscription } from 'rxjs';

@Component({
  selector: "app-roulette",
  templateUrl: "./roulette.component.html",
  styleUrls: ["./roulette.component.css"],
})
export class RouletteComponent implements OnInit, AfterViewInit, OnDestroy {
  paths: string[] = [];
  finalAngle: number = 0;
  tab = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  ballFalling: number | null = null; 
  betscopy: any[] = []; 
  private allServerURL = 'http://localhost:8000/game/playe';
  private subscription: Subscription | null = null;  // Ajout de la souscription
  
  @ViewChild("ball") ball!: ElementRef<SVGCircleElement>;
  @ViewChild("spinButton") spinButton!: ElementRef<HTMLButtonElement>;
  etatPartieService: any;

  constructor(
    private httpClient: HttpClient,
    private renderer: Renderer2,
    private router: Router,
    public PLAYERINFO: PlayoutComponent,
    private webSocketService: WebSocketService  // Injection du service WebSocket
  ) {
    this.PLAYERINFO.pageCharger = 0;
  }

  ngOnInit() { 
    if(!this.PLAYERINFO.joueurConnecter){this.router.navigate(['/login']);}
    if ( this.router.url === '/roulette') {
      // Si le joueur est connecté, commencez à générer les chemins et démarrez l'animation
      this.generatePaths();
      this.startAnimation();
     
  
     
    this.subscription = this.PLAYERINFO.etatPartie$.subscribe((num: number | undefined) => {
      if (num === 1) {
        // Redirigez vers le composant '/table' si l'état de la partie est 1
        this.router.navigate(['/table']);
      }
    });
  }
  }
  

  ngAfterViewInit() {
    if (this.ball && this.ball.nativeElement && this.spinButton && this.spinButton.nativeElement) {
      this.renderer.listen(this.spinButton.nativeElement, 'click', () => {
        this.startAnimation();
      });
    } else {
      console.error('Error: ball or spinButton reference is undefined or their native elements are undefined.');
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getBall(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      // Vérifiez si randomNumber est défini
      if (this.PLAYERINFO.randomNumber !== undefined) {
        // Si randomNumber est défini, résolvez la promesse avec sa valeur
        resolve(this.PLAYERINFO.randomNumber);
      } else {
        // Si randomNumber est indéfini, rejetez la promesse avec un message d'erreur
        reject(new Error("Le nombre aléatoire n'est pas défini."));
      }
    });
  }
  

  generatePaths(): void {
    const numSlices = 37;
    const sliceDegree = 360 / numSlices;
    for (let i = 0; i < numSlices; i++) {
      const startAngle = i * sliceDegree - 85;
      const endAngle = startAngle + sliceDegree;
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;

      const start = this.polarToCartesian(100, startAngle);
      const end = this.polarToCartesian(100, endAngle);

      const path = `M 0 0 L ${start.x} ${start.y} A 100 100 0 ${largeArc} 1 ${end.x} ${end.y} L 0 0`;
      this.paths.push(path);
    }
  }

  startAnimation() {
    this.getBall().then(randomSliceIndex => {
      const sliceDegree = 360 / 37;
      this.finalAngle = 1080 + randomSliceIndex * sliceDegree;
      console.log(this.tab[randomSliceIndex]);
      this.animateBall(this.finalAngle, this.tab[randomSliceIndex]);
      
    }).catch(error => {
      console.error('Error during animation:', error);
    });
  }
  animateBall(angle: number, ball: number) {
    if (this.ball && this.ball.nativeElement) {
      this.renderer.removeStyle(this.ball.nativeElement, 'transition');
      this.renderer.removeStyle(this.ball.nativeElement, 'transform');
      setTimeout(() => {
        this.renderer.setStyle(
          this.ball.nativeElement,
          'transition',
          'transform 4s ease-out',
        );
        this.renderer.setStyle(
          this.ball.nativeElement,
          'transform',
          `rotate(${angle}deg)`,
        );
      }, 100);
    
      this.renderer.listen(this.ball.nativeElement, 'transitionend', () => {
        this.calculGains(ball);
        this.ballFalling = ball; 
        console.log(this.ballFalling);
      });
    } else {
      console.error('Error: ball reference is undefined or its native element is undefined.');
    }
  }
  

  polarToCartesian(
    radius: number,
    angleInDegrees: number,
  ): { x: number; y: number } {
    const angleInRadians = ((angleInDegrees + 90) * Math.PI) / 180.0;
    return {
      x: radius * Math.cos(angleInRadians),
      y: radius * Math.sin(angleInRadians),
    };
  }

  WichIndiceInTab(numero: number) {
    let i = 0;
    for (i; i <= 36; i++) {
      if (this.tab[i] === numero) {
        return i;
      }
    }
    return -1;
  }

  calculGains(ball: number) {
    if (this.PLAYERINFO.tableauparie) {
      this.PLAYERINFO.oldCredit=this.PLAYERINFO.playerInfo.credit;
      this.betscopy = this.PLAYERINFO.tableauparie; 
      const formattedJson = {
        name: this.PLAYERINFO.playerInfo.pseudo, 
        credits: this.PLAYERINFO.playerInfo.credit, 
        ballNumber: ball,
        bets: this.betscopy
      };
  
      console.log(JSON.stringify(formattedJson));
  
      if (this.PLAYERINFO.playerInfo) {
        this.gameResult(formattedJson);
      }
    } else {
      console.error('Error: this.PLAYERINFO.tableauparie is undefined.');
    }
  }
  
  gameResult(data: any) {
    const headers = new HttpHeaders().set('Content-Type', 'application/json'); 
  
    this.httpClient.put<any>(this.allServerURL, data, { headers: headers })
      .subscribe(
        (response) => {
          console.log('PUT request successful:', response);
          delete response.mot_de_passe_hash;
  
          this.PLAYERINFO.playerInfo = response;
        },
        (error) => {
          console.error('PUT request error:', error);
        }
      );
  }
  
  red = [6, 12, 18, 24, 30, 36, 2, 8, 14, 20, 26, 32, 4, 10, 16, 22, 28, 34];
  black = [3, 9, 15, 21, 27, 33, 5, 11, 17, 23, 29, 35, 1, 7, 13, 19, 25, 31];
  green = [0];

  isCreditInRed(): boolean {
    return this.ballFalling !== null && this.red.includes(this.ballFalling);
  }

  isCreditInBlack(): boolean {
    return this.ballFalling !== null && this.black.includes(this.ballFalling);
  }

  isCreditInGreen(): boolean {
    return this.ballFalling !== null && this.green.includes(this.ballFalling);
  }

  getCreditDifference(): number {
    return (this.PLAYERINFO.playerInfo.credit || 0) - (this.PLAYERINFO.oldCredit || 0);
  }

}
