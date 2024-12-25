const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const browserSync = require('browser-sync').create();

// 构建任务
gulp.task('build', function () {
    return gulp.src('src/**/*.js') // 输入文件路径
        .pipe(concat('all.js'))    // 合并后的文件名
        .pipe(uglify())           // 压缩
        .pipe(gulp.dest('dist'))  // 输出目录
        .pipe(browserSync.stream()); // 自动刷新浏览器
});

// 静态服务器 + 监听文件变化
gulp.task('serve', function () {
    // 初始化服务器
    browserSync.init({
        server: {
            baseDir: './' // 项目根目录或构建后的路径
        },
        port: 3000 // 自定义端口号，可选
    });

    // 监听文件变化
    gulp.watch('src/**/*.js', gulp.series('build')); // JS 文件变动时重建
    gulp.watch('*.html').on('change', browserSync.reload); // HTML 文件变动时刷新
    gulp.watch('src/**/*.css').on('change', browserSync.reload); // CSS 文件变动时刷新
});

// 默认任务：构建并启动服务
gulp.task('default', gulp.series('build', 'serve'));
