 // Global variables
        let image = null;
        let canvas = null;
        let ctx = null;
        let points = [];
        let scalePoints = [];
        let scale = 1; // meters per pixel
        let scaleSet = false;
        let mode = 'scale'; // 'scale' or 'area'

        // Initialize
        document.getElementById('imageInput').addEventListener('change', handleImageUpload);

        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                image = new Image();
                image.onload = function() {
                    setupCanvas();
                    resetAll();
                    document.getElementById('scaleSection').style.display = 'block';
                    document.getElementById('toolsSection').style.display = 'block';
                    updateStatus();
                };
                image.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function setupCanvas() {
            const canvasArea = document.getElementById('canvasArea');
            canvasArea.innerHTML = '<canvas id="imageCanvas"></canvas>';
            
            canvas = document.getElementById('imageCanvas');
            ctx = canvas.getContext('2d');
            
            canvas.width = image.width;
            canvas.height = image.height;
            
            canvas.addEventListener('click', handleCanvasClick);
            
            drawCanvas();
        }

        function drawCanvas() {
            if (!canvas || !image) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);

            // Draw scale points
            if (scalePoints.length > 0) {
                ctx.strokeStyle = '#f44336';
                ctx.fillStyle = '#f44336';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);

                if (scalePoints.length === 1) {
                    ctx.beginPath();
                    ctx.arc(scalePoints[0].x, scalePoints[0].y, 5, 0, 2 * Math.PI);
                    ctx.fill();
                } else if (scalePoints.length === 2) {
                    ctx.beginPath();
                    ctx.moveTo(scalePoints[0].x, scalePoints[0].y);
                    ctx.lineTo(scalePoints[1].x, scalePoints[1].y);
                    ctx.stroke();

                    scalePoints.forEach(point => {
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                }
            }

            // Draw area points
            if (points.length > 0) {
                ctx.setLineDash([]);
                ctx.strokeStyle = '#4caf50';
                ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);

                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }

                if (points.length > 2) {
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.stroke();

                // Draw point markers
                points.forEach((point, index) => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                    ctx.fillStyle = '#4caf50';
                    ctx.fill();

                    ctx.fillStyle = '#1a237e';
                    ctx.font = '12px Kanit';
                    ctx.fillText(index + 1, point.x + 8, point.y - 8);
                });
            }
        }

        function handleCanvasClick(event) {
            const rect = canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left) * (canvas.width / rect.width);
            const y = (event.clientY - rect.top) * (canvas.height / rect.height);

            if (mode === 'scale' && scalePoints.length < 2) {
                scalePoints.push({ x, y });
                updateScaleUI();
            } else if (mode === 'area' && scaleSet) {
                points.push({ x, y });
                updateAreaUI();
            }

            drawCanvas();
            updateStatus();
        }

        function updateScaleUI() {
            document.getElementById('scalePoints').textContent = `จุดที่เลือก: ${scalePoints.length}/2`;
            
            const knownDistance = document.getElementById('knownDistance').value;
            const canSetScale = scalePoints.length === 2 && knownDistance;
            document.getElementById('setScaleBtn').disabled = !canSetScale;
        }

        function updateAreaUI() {
            document.getElementById('areaPoints').textContent = `จุดที่เลือก: ${points.length}`;
            document.getElementById('calculateBtn').disabled = points.length < 3;
        }

        function updateStatus() {
            const statusOverlay = document.getElementById('statusOverlay');
            statusOverlay.style.display = 'block';
            
            document.getElementById('currentMode').textContent = 
                `โหมด: ${mode === 'scale' ? 'กำหนดมาตราส่วน' : 'วาดพื้นที่'}`;
                
            if (mode === 'scale') {
                document.getElementById('pointCount').textContent = 
                    `จุดมาตราส่วน: ${scalePoints.length}/2`;
            } else {
                document.getElementById('pointCount').textContent = 
                    `จุดพื้นที่: ${points.length}`;
            }
        }

        function setScale() {
            const knownDistance = parseFloat(document.getElementById('knownDistance').value);
            if (scalePoints.length !== 2 || !knownDistance) return;

            const pixelDistance = calculateDistance(scalePoints[0], scalePoints[1]);
            scale = knownDistance / pixelDistance;
            scaleSet = true;
            mode = 'area';

            document.getElementById('scaleInstructions').style.display = 'none';
            document.getElementById('scaleResult').style.display = 'block';
            document.getElementById('scaleValue').textContent = 
                scale.toLocaleString('th-TH', { maximumFractionDigits: 4 });
            
            document.getElementById('areaSection').style.display = 'block';
            updateStatus();
        }

        function calculateDistance(p1, p2) {
            return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        }

        function calculateArea() {
            if (points.length < 3 || !scaleSet) return;

            // Shoelace formula
            let area = 0;
            const n = points.length;

            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                area += points[i].x * points[j].y;
                area -= points[j].x * points[i].y;
            }

            area = Math.abs(area) / 2;
            const areaInMeters = area * scale * scale;

            displayResults(areaInMeters);
            document.getElementById('exportBtn').disabled = false;
        }

        function displayResults(areaInMeters) {
            const unit = document.getElementById('unitSelect').value;
            const convertedArea = convertArea(areaInMeters, unit);
            
            document.getElementById('mainAreaResult').textContent = 
                `พื้นที่: ${formatNumber(convertedArea)} ${getUnitDisplay(unit)}`;

            // Show all conversions
            const conversions = [
                { unit: 'm²', name: 'ตารางเมตร' },
                { unit: 'km²', name: 'ตารางกิโลเมตร' },
                { unit: 'rai', name: 'ไร่' },
                { unit: 'ngan', name: 'งาน' },
                { unit: 'wa', name: 'ตารางวา' },
                { unit: 'hectare', name: 'เฮกเตอร์' }
            ];

            const conversionHTML = conversions.map(conv => {
                const value = convertArea(areaInMeters, conv.unit);
                return `<li>${formatNumber(value)} ${conv.name}</li>`;
            }).join('');

            document.getElementById('conversionResults').innerHTML = conversionHTML;
            document.getElementById('areaResult').style.display = 'block';
        }

        function convertArea(areaInMeters, targetUnit) {
            const conversions = {
                'm²': 1,
                'km²': 1/1000000,
                'rai': 1/1600,
                'ngan': 1/400,
                'wa': 1/4,
                'hectare': 1/10000
            };
            return areaInMeters * (conversions[targetUnit] || 1);
        }

        function getUnitDisplay(unit) {
            const displays = {
                'm²': 'ตร.ม.',
                'km²': 'ตร.กม.',
                'rai': 'ไร่',
                'ngan': 'งาน',
                'wa': 'ตร.วา',
                'hectare': 'เฮกเตอร์'
            };
            return displays[unit] || unit;
        }

        function formatNumber(num) {
            return num.toLocaleString('th-TH', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
        }

        function resetAll() {
            points = [];
            scalePoints = [];
            scale = 1;
            scaleSet = false;
            mode = 'scale';

            document.getElementById('knownDistance').value = '';
            document.getElementById('scaleInstructions').style.display = 'block';
            document.getElementById('scaleResult').style.display = 'none';
            document.getElementById('areaSection').style.display = 'none';
            document.getElementById('areaResult').style.display = 'none';
            document.getElementById('exportBtn').disabled = true;

            updateScaleUI();
            updateAreaUI();
            updateStatus();
            
            if (canvas) drawCanvas();
        }

        function exportData() {
            const unit = document.getElementById('unitSelect').value;
            const areaInMeters = calculateAreaValue();
            
            const data = {
                timestamp: new Date().toISOString(),
                scale: scale,
                scalePoints: scalePoints,
                areaPoints: points,
                area: {
                    squareMeters: areaInMeters,
                    selectedUnit: unit,
                    selectedUnitValue: convertArea(areaInMeters, unit)
                },
                allConversions: {
                    squareMeters: areaInMeters,
                    squareKilometers: convertArea(areaInMeters, 'km²'),
                    rai: convertArea(areaInMeters, 'rai'),
                    ngan: convertArea(areaInMeters, 'ngan'),
                    squareWa: convertArea(areaInMeters, 'wa'),
                    hectares: convertArea(areaInMeters, 'hectare')
                }
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `area-calculation-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        function calculateAreaValue() {
            if (points.length < 3) return 0;
            
            let area = 0;
            const n = points.length;
            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                area += points[i].x * points[j].y;
                area -= points[j].x * points[i].y;
            }
            area = Math.abs(area) / 2;
            return area * scale * scale;
        }

        // Auto-update UI when known distance is entered
        document.getElementById('knownDistance').addEventListener('input', updateScaleUI);