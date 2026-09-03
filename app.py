import os
import io
import time
import hashlib
import zipfile
import re
import json
import subprocess
import threading
from pathlib import Path
from flask import Flask, render_template, jsonify, send_from_directory, send_file, request, abort
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB max upload limit

BASE_DIR = Path(__file__).parent.resolve()
BROCHURE_DIR = BASE_DIR / 'brochures'
BROCHURE_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAIL_DIR = BASE_DIR / 'static' / 'thumbnails'
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)
DEMOS_FILE = BASE_DIR / 'demos.json'

ALLOWED_EXTENSIONS = {'.pdf', '.pptx', '.ppt', '.doc', '.docx'}
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'ingenero360')

PRODUCT_CATEGORIES = [
    'CDUX360', 'CokerX360', 'EnergyX360', 'OutlierX360', 
    'ReliabilityX360', 'VDUX360', 'controllerX360', 
    'furnaceX360', 'genX360', 'maintenanceX360'
]

def load_demos():
    if not DEMOS_FILE.exists():
        initial_demos = [
            {
                "id": "demo-1",
                "title": "Furnace Dashboard Demo",
                "url": "https://furnace.ingenero360.ai/",
                "category": "Live Dashboard",
                "description": "Interactive real-time furnace optimization and process monitoring AI dashboard."
            },
            {
                "id": "demo-2",
                "title": "Ingenero360 Demo Videos",
                "url": "https://demos.ingenero360.ai/public/",
                "category": "Demo Videos",
                "description": "Library of public product walkthrough videos, AI feature demonstrations, and solution walkthroughs."
            }
        ]
        save_demos(initial_demos)
        return initial_demos
    try:
        with open(DEMOS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading demos.json: {e}")
        return []

def save_demos(demos):
    try:
        with open(DEMOS_FILE, 'w', encoding='utf-8') as f:
            json.dump(demos, f, indent=2)
    except Exception as e:
        print(f"Error saving demos.json: {e}")

def git_commit_and_push_async(filename, action="Update"):
    """Commits file changes and associated thumbnails to local git repo and pushes to GitHub asynchronously."""
    def _sync():
        try:
            subprocess.run(["git", "add", "-A"], cwd=str(BASE_DIR), capture_output=True, text=True, check=False)
            subprocess.run(["git", "commit", "-m", f"{action}: {filename} via IngeneroX360AI portal"], cwd=str(BASE_DIR), capture_output=True, text=True, check=False)
            res = subprocess.run(["git", "push"], cwd=str(BASE_DIR), capture_output=True, text=True, check=False)
            print(f"[GitHub Sync] Push result for {filename}: code={res.returncode}, out={res.stdout.strip()}")
        except Exception as e:
            print(f"[GitHub Sync Error] Failed to sync {filename}: {e}")

    thread = threading.Thread(target=_sync)
    thread.daemon = True
    thread.start()

def git_pull_latest():
    """Pulls latest files from GitHub repository."""
    try:
        res = subprocess.run(["git", "pull"], cwd=str(BASE_DIR), capture_output=True, text=True, check=False)
        print(f"[GitHub Pull] Result: code={res.returncode}, out={res.stdout.strip()}")
        return res.returncode == 0
    except Exception as e:
        print(f"[GitHub Pull Error]: {e}")
        return False

def get_file_category(filename):
    match = re.search(r'([a-zA-Z0-9]+[xX]360)', filename)
    if match:
        return match.group(1)
    fname_upper = filename.upper()
    for cat in PRODUCT_CATEGORIES:
        if cat.upper() in fname_upper:
            return cat
    return 'Other Products'

def format_file_size(size_in_bytes):
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    elif size_in_bytes < 1024 * 1024:
        return f"{size_in_bytes / 1024:.1f} KB"
    else:
        return f"{size_in_bytes / (1024 * 1024):.1f} MB"

def generate_pdf_thumbnail(pdf_path, thumb_path):
    """Generates a PNG thumbnail from the first page of a PDF using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(str(pdf_path))
        if len(doc) > 0:
            page = doc[0]
            pix = page.get_pixmap(dpi=150)
            pix.save(str(thumb_path))
            doc.close()
            return True
    except Exception as e:
        print(f"Error generating thumbnail for {pdf_path}: {e}")
    return False

def get_thumbnail_url(file_path):
    ext = file_path.suffix.lower()
    if ext != '.pdf':
        return None
        
    named_thumb = THUMBNAIL_DIR / f"{file_path.stem}.png"
    if named_thumb.exists():
        return f"/static/thumbnails/{file_path.stem}.png"
        
    mtime = int(file_path.stat().st_mtime)
    file_hash = hashlib.md5(f"{file_path.name}_{mtime}".encode('utf-8')).hexdigest()
    thumb_name = f"{file_hash}.png"
    thumb_path = THUMBNAIL_DIR / thumb_name
    
    if not thumb_path.exists():
        success = generate_pdf_thumbnail(file_path, thumb_path)
        if not success:
            return None
    return f"/static/thumbnails/{thumb_name}"

def scan_brochures():
    brochures = []
    if not BROCHURE_DIR.exists():
        return brochures
        
    for item in BROCHURE_DIR.iterdir():
        if item.is_file() and item.suffix.lower() in ALLOWED_EXTENSIONS:
            if item.name.startswith('.'):
                continue
                
            stat = item.stat()
            category = get_file_category(item.name)
            thumb_url = get_thumbnail_url(item)
            
            clean_title = item.stem.replace('_', ' ').replace('-', ' ')
            clean_title = re.sub(r'\s+', ' ', clean_title).strip()
            
            brochures.append({
                'filename': item.name,
                'title': clean_title,
                'category': category,
                'format': item.suffix.lower().replace('.', '').upper(),
                'ext': item.suffix.lower(),
                'size': stat.st_size,
                'size_formatted': format_file_size(stat.st_size),
                'modified_time': stat.st_mtime,
                'modified_date': time.strftime('%b %d, %Y', time.localtime(stat.st_mtime)),
                'thumbnail_url': thumb_url,
                'download_url': f"/download/{item.name}",
                'preview_url': f"/preview/{item.name}"
            })
            
    brochures.sort(key=lambda x: x['modified_time'], reverse=True)
    return brochures

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(BASE_DIR / 'static', 'favicon.png', mimetype='image/png')

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json(silent=True) or {}
    password = data.get('password', '')
    if password == ADMIN_PASSWORD:
        return jsonify({'status': 'success', 'message': 'Admin login successful', 'token': 'ADMIN_AUTH_VALID'})
    return jsonify({'status': 'error', 'message': 'Invalid Admin Password'}), 401

@app.route('/api/brochures')
def api_brochures():
    brochures = scan_brochures()
    categories = sorted(list(set(b['category'] for b in brochures)))
    return jsonify({
        'status': 'success',
        'count': len(brochures),
        'categories': categories,
        'brochures': brochures
    })

@app.route('/api/demos')
def api_demos():
    demos = load_demos()
    return jsonify({
        'status': 'success',
        'count': len(demos),
        'demos': demos
    })

@app.route('/api/demos/add', methods=['POST'])
def add_demo():
    data = request.get_json(silent=True) or {}
    title = data.get('title', '').strip()
    url = data.get('url', '').strip()
    category = data.get('category', 'Live Dashboard').strip()
    description = data.get('description', '').strip()
    
    if not title or not url:
        return jsonify({'status': 'error', 'message': 'Title and URL are required'}), 400
        
    demos = load_demos()
    demo_id = f"demo-{int(time.time() * 1000)}"
    new_demo = {
        'id': demo_id,
        'title': title,
        'url': url,
        'category': category,
        'description': description
    }
    demos.append(new_demo)
    save_demos(demos)
    
    git_commit_and_push_async("demos.json", f"Add Demo: {title}")
    return jsonify({'status': 'success', 'message': f'Demo link "{title}" added and backed up to GitHub!', 'demo': new_demo})

@app.route('/api/demos/edit', methods=['POST'])
def edit_demo():
    data = request.get_json(silent=True) or {}
    demo_id = data.get('id', '')
    title = data.get('title', '').strip()
    url = data.get('url', '').strip()
    category = data.get('category', 'Live Dashboard').strip()
    description = data.get('description', '').strip()
    
    if not demo_id or not title or not url:
        return jsonify({'status': 'error', 'message': 'Missing demo details'}), 400
        
    demos = load_demos()
    found = False
    for item in demos:
        if item['id'] == demo_id:
            item['title'] = title
            item['url'] = url
            item['category'] = category
            item['description'] = description
            found = True
            break
            
    if not found:
        return jsonify({'status': 'error', 'message': 'Demo link not found'}), 404
        
    save_demos(demos)
    git_commit_and_push_async("demos.json", f"Edit Demo: {title}")
    return jsonify({'status': 'success', 'message': f'Demo link "{title}" updated and synced to GitHub!'})

@app.route('/api/demos/delete/<demo_id>', methods=['DELETE'])
def delete_demo(demo_id):
    demos = load_demos()
    initial_len = len(demos)
    demos = [d for d in demos if d['id'] != demo_id]
    
    if len(demos) == initial_len:
        return jsonify({'status': 'error', 'message': 'Demo link not found'}), 404
        
    save_demos(demos)
    git_commit_and_push_async("demos.json", f"Delete Demo: {demo_id}")
    return jsonify({'status': 'success', 'message': 'Demo link deleted and synced to GitHub.'})

@app.route('/download/<filename>')
def download_file(filename):
    file_path = BROCHURE_DIR / filename
    if not file_path.exists() or file_path.suffix.lower() not in ALLOWED_EXTENSIONS:
        abort(404)
    return send_from_directory(BROCHURE_DIR, filename, as_attachment=True)

@app.route('/preview/<filename>')
def preview_file(filename):
    file_path = BROCHURE_DIR / filename
    if not file_path.exists() or file_path.suffix.lower() not in ALLOWED_EXTENSIONS:
        abort(404)
    mimetype = 'application/pdf' if file_path.suffix.lower() == '.pdf' else None
    return send_from_directory(BROCHURE_DIR, filename, mimetype=mimetype)

@app.route('/api/upload', methods=['POST'])
def upload_brochure():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file uploaded'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'Empty filename'}), 400
        
    filename = secure_filename(file.filename)
    if not filename:
        filename = file.filename
        
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'status': 'error', 'message': f'File format {ext} not allowed.'}), 400
        
    target_path = BROCHURE_DIR / filename
    file.save(str(target_path))
    
    if ext == '.pdf':
        named_thumb = THUMBNAIL_DIR / f"{target_path.stem}.png"
        generate_pdf_thumbnail(target_path, named_thumb)
        
    git_commit_and_push_async(filename, "Upload Brochure & Thumbnail")
        
    return jsonify({
        'status': 'success',
        'message': f'Brochure "{filename}" uploaded, cover thumbnail generated, and synced to GitHub!',
        'filename': filename
    })

@app.route('/api/admin/rename', methods=['POST'])
def rename_brochure():
    data = request.get_json(silent=True) or {}
    old_filename = data.get('old_filename', '')
    new_filename = data.get('new_filename', '')
    
    if not old_filename or not new_filename:
        return jsonify({'status': 'error', 'message': 'Missing old or new filename'}), 400
        
    old_path = BROCHURE_DIR / old_filename
    if not old_path.exists():
        return jsonify({'status': 'error', 'message': 'Original file not found'}), 404
        
    ext = old_path.suffix.lower()
    if not new_filename.lower().endswith(ext):
        new_filename += ext
        
    new_filename = secure_filename(new_filename)
    new_path = BROCHURE_DIR / new_filename
    
    try:
        old_path.rename(new_path)
        if ext == '.pdf':
            named_thumb = THUMBNAIL_DIR / f"{new_path.stem}.png"
            generate_pdf_thumbnail(new_path, named_thumb)
        git_commit_and_push_async(new_filename, "Rename")
        return jsonify({'status': 'success', 'message': f'Brochure renamed to "{new_filename}"', 'new_filename': new_filename})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/git-sync', methods=['POST'])
def git_sync():
    success = git_pull_latest()
    brochures = scan_brochures()
    demos = load_demos()
    return jsonify({
        'status': 'success' if success else 'warning',
        'message': 'Pulled latest files and demos from GitHub' if success else 'Completed local scan',
        'brochures_count': len(brochures),
        'demos_count': len(demos)
    })

@app.route('/api/download-zip', methods=['POST'])
def download_zip():
    data = request.get_json(silent=True) or {}
    filenames = data.get('filenames', [])
    
    if not filenames:
        all_brochures = scan_brochures()
        filenames = [b['filename'] for b in all_brochures]
        
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for fname in filenames:
            fpath = BROCHURE_DIR / fname
            if fpath.exists() and fpath.is_file():
                zf.write(fpath, arcname=fname)
                
    memory_file.seek(0)
    zip_filename = f"ingeneroX360AI_Suite_Brochures_{int(time.time())}.zip"
    return send_file(
        memory_file,
        mimetype='application/zip',
        as_attachment=True,
        download_name=zip_filename
    )

@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    file_path = BROCHURE_DIR / filename
    if not file_path.exists() or file_path.suffix.lower() not in ALLOWED_EXTENSIONS:
        return jsonify({'status': 'error', 'message': 'File not found'}), 404
        
    try:
        file_path.unlink()
        thumb_path = THUMBNAIL_DIR / f"{file_path.stem}.png"
        if thumb_path.exists():
            thumb_path.unlink()
        git_commit_and_push_async(filename, "Delete")
        return jsonify({'status': 'success', 'message': f'Brochure "{filename}" deleted and synced to GitHub.'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("Starting IngeneroX360AI Brochure & Demos Portal...")
    app.run(host='0.0.0.0', port=5000, debug=True)
