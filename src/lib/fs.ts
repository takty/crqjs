export class FS {
	private root: FileSystemDirectoryHandle;

	constructor(root: FileSystemDirectoryHandle) {
		this.root = root;
	}

	// --- Internal Utilities

	private normalize(path: string): string[] {
		return path.split('/').filter(Boolean);
	}

	private basename(path: string): string {
		const parts = this.normalize(path);
		return parts.at(-1) ?? '';
	}

	private dirname(path: string): string {
		const parts = this.normalize(path);
		return parts.slice(0, -1).join('/');
	}

	// --- Get Handle

	private async resolveHandle(
		path: string,
		options: { createFile?: boolean; createDir?: boolean } = {}
	): Promise<FileSystemFileHandle | FileSystemDirectoryHandle> {
		const parts = this.normalize(path);
		let dir = this.root;
		for (let i = 0; i < parts.length - 1; i++) {
			dir = await dir.getDirectoryHandle(parts[i], { create: options.createDir });
		}
		const last = parts.at(-1)!;
		if (options.createFile) {
			return await dir.getFileHandle(last, { create: true });
		}
		if (options.createDir) {
			return await dir.getDirectoryHandle(last, { create: true });
		}
		try {
			return await dir.getFileHandle(last);
		} catch {
			return await dir.getDirectoryHandle(last);
		}
	}

	// --- File Operations

	async readFile(path: string): Promise<string> {
		const fh = await this.resolveHandle(path);
		const file = await (fh as FileSystemFileHandle).getFile();
		return await file.text();
	}

	async readFileAsArrayBuffer(path: string): Promise<ArrayBuffer> {
		const fh = await this.resolveHandle(path);
		const file = await (fh as FileSystemFileHandle).getFile();
		return await file.arrayBuffer();
	}

	async writeFile(path: string, data: string | Blob | ArrayBuffer): Promise<void> {
		const fh = await this.resolveHandle(path, { createFile: true });
		const writable = await (fh as FileSystemFileHandle).createWritable();
		await writable.write(data);
		await writable.close();
	}

	async writeJSON(path: string, obj: any): Promise<void> {
		await this.writeFile(path, JSON.stringify(obj, null, 2));
	}

	async readJSON<T = any>(path: string): Promise<T> {
		const txt = await this.readFile(path);
		return JSON.parse(txt);
	}

	// --- Directory Operations

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		if (options?.recursive) {
			const parts = this.normalize(path);
			let dir = this.root;
			for (const p of parts) {
				dir = await dir.getDirectoryHandle(p, { create: true });
			}
		} else {
			await this.resolveHandle(path, { createDir: true });
		}
	}

	async readdir(path: string = ''): Promise<string[]> {
		const dh = path ? await this.resolveHandle(path) : this.root;
		const entries: string[] = [];
		for await (const [name] of (dh as FileSystemDirectoryHandle).entries()) {
			entries.push(name);
		}
		return entries;
	}

	async unlink(path: string): Promise<void> {
		const dirPath = this.dirname(path);
		const name = this.basename(path);
		const dir = dirPath ? await this.resolveHandle(dirPath) : this.root;
		await (dir as FileSystemDirectoryHandle).removeEntry(name);
	}

	// --- Get Metadata

	async stat(path: string): Promise<{
		isFile: boolean;
		isDirectory: boolean;
		name: string;
		size?: number;
		lastModified?: number;
		type?: string;
	}> {
		const handle = await this.resolveHandle(path);
		const isFile = handle.kind === 'file';
		const isDirectory = handle.kind === 'directory';
		const name = handle.name;

		if (isFile) {
			const file = await (handle as FileSystemFileHandle).getFile();
			return {
				isFile: true,
				isDirectory: false,
				name,
				size: file.size,
				lastModified: file.lastModified,
				type: file.type,
			};
		}

		return { isFile: false, isDirectory: true, name };
	}

	// --- Additional Utilities

	async rename(oldPath: string, newPath: string): Promise<void> {
		const data = await this.readFileAsArrayBuffer(oldPath);
		await this.writeFile(newPath, data);
		await this.unlink(oldPath);
	}

	async copyFile(src: string, dst: string): Promise<void> {
		const data = await this.readFileAsArrayBuffer(src);
		await this.writeFile(dst, data);
	}
}
