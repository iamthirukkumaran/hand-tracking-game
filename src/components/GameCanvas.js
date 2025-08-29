// GameCanvas.js
import React, { useEffect, useRef } from "react";
import p5 from "p5";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import "./GameCanvas.css"; // optional CSS

const GameCanvas = () => {
  const scoreRef = useRef(null);
  const pausedRef = useRef(null);
  const canvasParentRef = useRef(null);
  const p5InstanceRef = useRef(null);

  useEffect(() => {
    let catcherX = 200;
    let balls = [];
    let score = 0;
    let video;
    let hands;
    let camera;
    let gamePaused = true;
    let lastHandSeen = 0;
    let ballInterval = null;

    const sensitivity = 0.4; // increase for faster response (0.1–1.0)

    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(500, 400).parent(canvasParentRef.current);

        // Video capture
        video = p.createCapture(p.VIDEO);
        video.size(640, 480);
        video.hide();

        // MediaPipe Hands
        hands = new Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        hands.onResults(gotHands);

        camera = new Camera(video.elt, {
          onFrame: async () => {
            await hands.send({ image: video.elt });
          },
          width: 640,
          height: 480,
        });

        camera.start();
      };

      p.draw = () => {
        p.clear();

        // Pause if no hand detected
        if (p.millis() - lastHandSeen > 1000) {
          if (!gamePaused) {
            gamePaused = true;
            if (pausedRef.current) pausedRef.current.style.display = "block";
            if (ballInterval) {
              clearInterval(ballInterval);
              ballInterval = null;
            }
          }
        }

        // Draw catcher
        p.push();
        p.drawingContext.shadowBlur = 25;
        p.drawingContext.shadowColor = "cyan";
        p.fill("rgba(0,255,255,0.8)");
        p.rect(catcherX - 50, p.height - 30, 100, 20, 10);
        p.pop();

        // Draw and move balls
        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i];

          p.push();
          p.drawingContext.shadowBlur = 20;
          p.drawingContext.shadowColor = "white";
          p.fill(b.color);
          p.ellipse(b.x, b.y, 25, 25);
          p.pop();

          if (!gamePaused) {
            b.y += 4;

            // Collision
            if (
              b.y > p.height - 40 &&
              b.x > catcherX - 50 &&
              b.x < catcherX + 50
            ) {
              score++;
              if (scoreRef.current) scoreRef.current.innerText = "Score: " + score;
              balls.splice(i, 1);
            } else if (b.y > p.height) {
              balls.splice(i, 1);
            }
          }
        }
      };

      function gotHands(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const hand = results.multiHandLandmarks[0];
          const x = hand[8].x; // index finger tip
          const targetX = x * p.width;

          // Smooth high-sensitivity movement
          catcherX += (targetX - catcherX) * sensitivity;

          lastHandSeen = p.millis();

          if (gamePaused) {
            gamePaused = false;
            if (pausedRef.current) pausedRef.current.style.display = "none";

            // Spawn first ball immediately
            balls.push({
              x: p.random(20, 480),
              y: 0,
              color: p.color(p.random(255), p.random(255), p.random(255)),
            });

            // Start spawning balls continuously
            if (!ballInterval) {
              ballInterval = setInterval(() => {
                balls.push({
                  x: p.random(20, 480),
                  y: 0,
                  color: p.color(p.random(255), p.random(255), p.random(255)),
                });
              }, 1500);
            }
          }
        }
      }
    };

    p5InstanceRef.current = new p5(sketch, canvasParentRef.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
      if (ballInterval) clearInterval(ballInterval);
    };
  }, []);

  return (
    <div id="game-container" style={{ margin: "0 auto", position: "relative" }}>
  {/* Canvas will be appended here by p5 */}
  <div ref={canvasParentRef}></div>

  {/* Scoreboard */}
  <div className="scoreboard" ref={scoreRef}>
    Score: 0
  </div>

  {/* Pause overlay */}
  <div className="paused" ref={pausedRef}>
    ⏸ Game Paused (Show your hand to start)
  </div>
</div>

  );
};

export default GameCanvas;
