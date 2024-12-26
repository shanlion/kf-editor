/**
 * Created by hn on 14-3-17.
 */

define(function (require) {
    var kity = require("kity"),
        // UiUitls
        $$ = require("ui/ui-impl/ui-utils"),
        Utils = require("base/utils"),
        VIEW_STATE = require("ui/def").VIEW_STATE,
        Scrollbar = require("ui/ui-impl/scrollbar/scrollbar"),
        Toolbar = require("ui/toolbar/toolbar"),
        // 控制组件
        ScrollZoom = require("ui/control/zoom"),
        ELEMENT_LIST = require("ui/toolbar-ele-list"),
        UIComponent = kity.createClass("UIComponent", {
            constructor: function (kfEditor, options) {
                var currentDocument = null;

                this.options = options;

                this.container = kfEditor.getContainer();

                currentDocument = this.container.ownerDocument;

                // ui组件实例集合
                this.components = {};

                this.canvasRect = null;
                this.viewState = VIEW_STATE.NO_OVERFLOW;

                this.kfEditor = kfEditor;

                this.toolbarWrap = createToolbarWrap(currentDocument);
                this.toolbarContainer = createToolbarContainer(currentDocument);
                this.editArea = createEditArea(currentDocument);
                this.canvasContainer = createCanvasContainer(currentDocument);
                this.canvasOptions = createCanvasOptions(
                    currentDocument,
                    kfEditor
                );
                this.scrollbarContainer =
                    createScrollbarContainer(currentDocument);

                this.toolbarWrap.appendChild(this.toolbarContainer);
                this.container.appendChild(this.toolbarWrap);
                this.editArea.appendChild(this.canvasContainer);
                this.container.appendChild(this.canvasOptions);
                this.container.appendChild(this.editArea);
                this.container.appendChild(this.scrollbarContainer);

                this.initComponents();

                this.initServices();

                this.initEvent();

                this.updateContainerSize(
                    this.container,
                    this.toolbarWrap,
                    this.editArea,
                    this.canvasContainer
                );

                this.initScrollEvent();
            },

            // 组件实例化
            initComponents: function () {
                // 工具栏组件
                this.components.toolbar = new Toolbar(
                    this,
                    this.kfEditor,
                    ELEMENT_LIST
                );

                // TODO 禁用缩放, 留待后面再重新开启
                if (false) {
                    if (this.options.zoom) {
                        this.components.scrollZoom = new ScrollZoom(
                            this,
                            this.kfEditor,
                            this.canvasContainer,
                            {
                                max: this.options.maxzoom,
                                min: this.options.minzoom
                            }
                        );
                    }
                }

                this.components.scrollbar = new Scrollbar(this, this.kfEditor);
            },

            updateContainerSize: function (container, toolbar, editArea) {
                var containerBox = container.getBoundingClientRect(),
                    toolbarBox = toolbar.getBoundingClientRect();

                editArea.style.width = containerBox.width + "px";
                editArea.style.height =
                    containerBox.bottom - toolbarBox.bottom + "px";
            },

            // 初始化服务
            initServices: function () {
                this.kfEditor.registerService("ui.get.canvas.container", this, {
                    getCanvasContainer: this.getCanvasContainer
                });

                this.kfEditor.registerService("ui.update.canvas.view", this, {
                    updateCanvasView: this.updateCanvasView
                });

                this.kfEditor.registerService(
                    "ui.canvas.container.event",
                    this,
                    {
                        on: this.addEvent,
                        off: this.removeEvent,
                        trigger: this.trigger,
                        fire: this.trigger
                    }
                );
            },

            initEvent: function () {
                //                Utils.addEvent( this.container, 'mousewheel', function ( e ) {
                //                    e.preventDefault();
                //                } );
            },

            initScrollEvent: function () {
                var _self = this;

                this.kfEditor.requestService(
                    "ui.set.scrollbar.update.handler",
                    function (proportion, offset, values) {
                        offset = Math.floor(
                            proportion *
                                (values.contentWidth - values.viewWidth)
                        );
                        _self.kfEditor.requestService(
                            "render.set.canvas.offset",
                            offset
                        );
                    }
                );
            },

            getCanvasContainer: function () {
                return this.canvasContainer;
            },

            addEvent: function (type, handler) {
                Utils.addEvent(this.canvasContainer, type, handler);
            },

            removeEvent: function () {},

            trigger: function (type) {
                Utils.trigger(this.canvasContainer, type);
            },

            // 更新画布视窗， 决定是否出现滚动条
            updateCanvasView: function () {
                var canvas = this.kfEditor.requestService("render.get.canvas"),
                    contentContainer = canvas.getContentContainer(),
                    contentRect = null;

                if (this.canvasRect === null) {
                    // 兼容firfox， 获取容器大小，而不是获取画布大小
                    this.canvasRect =
                        this.canvasContainer.getBoundingClientRect();
                }

                contentRect = contentContainer.getRenderBox("paper");

                if (contentRect.width > this.canvasRect.width) {
                    if (this.viewState === VIEW_STATE.NO_OVERFLOW) {
                        this.toggleViewState();
                        this.kfEditor.requestService("ui.show.scrollbar");
                        this.kfEditor.requestService(
                            "render.disable.relocation"
                        );
                    }

                    this.kfEditor.requestService("render.relocation");

                    // 更新滚动条， 参数是：滚动条所控制的内容长度
                    this.kfEditor.requestService(
                        "ui.update.scrollbar",
                        contentRect.width
                    );
                    this.kfEditor.requestService("ui.relocation.scrollbar");
                } else {
                    if (this.viewState === VIEW_STATE.OVERFLOW) {
                        this.toggleViewState();
                        this.kfEditor.requestService("ui.hide.scrollbar");
                        this.kfEditor.requestService(
                            "render.enable.relocation"
                        );
                    }

                    this.kfEditor.requestService("render.relocation");
                }
            },

            toggleViewState: function () {
                this.viewState =
                    this.viewState === VIEW_STATE.NO_OVERFLOW
                        ? VIEW_STATE.OVERFLOW
                        : VIEW_STATE.NO_OVERFLOW;
            }
        });

    function createToolbarWrap(doc) {
        return $$.ele(doc, "div", {
            className: "kf-editor-toolbar"
        });
    }

    function createToolbarContainer(doc) {
        return $$.ele(doc, "div", {
            className: "kf-editor-inner-toolbar"
        });
    }

    function createEditArea(doc) {
        var container = doc.createElement("div");
        container.className = "kf-editor-edit-area";
        container.style.width = "80%";
        container.style.height = "800px";
        return container;
    }
    function createCanvasOptions(doc, kfEditor) {
        var container = doc.createElement("div");
        container.className = "kf-editor-canvas-option";
        // 创建一个 input 输入框
        var input = document.createElement("input");
        input.type = "text"; // 设置为文本输入框
        input.placeholder = "请输入字体大小"; // 占位符
        container.appendChild(input);
        input.addEventListener("input", function () {
            let scale = (input.value || 50) / 50;
            kfEditor.requestService("render.set.canvas.zoom", scale);
        });
        // 使用颜色选择器
        createColorPicker(container, kfEditor);
        createFrontPicker(container);
        return container;
    }
    // 创建颜色选择器
    function createColorPicker(parentElement, kfEditor) {
        const colors = [
            "#ff0000",
            "#00ff00",
            "#0000ff",
            "#ffff00",
            "#ff00ff",
            "#00ffff",
            "#000000",
            "#ffffff",
            "#808080",
            "#800000",
            "#808000",
            "#008000",
            "#800080",
            "#008080",
            "#000080",
            "#ffa500"
        ];

        // 创建按钮
        const button = document.createElement("button");
        button.textContent = "选择颜色";
        button.style.position = "relative";

        // 创建下拉容器
        const dropdown = document.createElement("div");
        dropdown.className = "kf-editor-dropdown";
        dropdown.style.display = "none";

        // 创建颜色方块
        colors.forEach((color) => {
            const colorBlock = document.createElement("div");
            colorBlock.style.background = color;
            colorBlock.style.width = "30px";
            colorBlock.style.height = "30px";
            colorBlock.style.cursor = "pointer";
            colorBlock.style.border = "1px solid #ccc";
            colorBlock.addEventListener("click", () => {
                button.style.background = color; // 改变按钮颜色
                dropdown.style.display = "none"; // 收起下拉框
                var svgElement = document.querySelectorAll(
                    ".kf-editor-canvas-container svg"
                );
                svgElement.forEach(function (svg) {
                    svg.setAttribute("fill", color);
                });
                var pathElement = document.querySelectorAll('.kf-editor-canvas-container path');
                pathElement.forEach(function (path) {
                    var fillColor = path.getAttribute('fill');
                    if (fillColor !== 'transparent' && fillColor !== 'none') {
                        path.setAttribute('fill', color)
                    }
                });
                /* var textElements = document.querySelectorAll('.kf-editor-canvas-container svg text');
                let range = kfEditor.services['syntax.update.selection'].provider.record.cursor
                let startOffset = range.startOffset
                let endOffset = range.endOffset
                if (!(endOffset - startOffset)) {
                    var svgElement = document.querySelectorAll(
                        ".kf-editor-canvas-container svg"
                    );
                    svgElement.forEach(function (svg) {
                        svg.setAttribute("fill", color);
                    });
                } else {
                    textElements.forEach(function (text, index) {
                        if (index >= startOffset && index < endOffset) {
                            text.setAttribute("fill", color);
                        }
                    })
                } */
            });
            dropdown.appendChild(colorBlock);
        });

        // 点击按钮切换下拉框显示
        button.addEventListener("click", () => {
            dropdown.style.display =
                dropdown.style.display === "none" ? "grid" : "none";
        });

        // 点击其他地方关闭下拉框
        document.addEventListener("click", (e) => {
            if (!button.contains(e.target)) {
                dropdown.style.display = "none";
            }
        });

        // 将按钮和下拉框添加到父元素
        parentElement.appendChild(button);
        button.appendChild(dropdown);
    }
    // 创建字体选择器
    function createFrontPicker(parentElement) {
        const fonts = [
            {
                name: "默认",
                value: "KF AMS MAIN"
            },
            {
                name: "花体",
                value: "KF AMS FRAK"
            },
            {
                name: "手写体",
                value: "KF AMS CAL"
            },
            // {
            //     name: "双线",
            //     value: "KF AMS BB"
            // },
            {
                name: "罗马体",
                value: "KF AMS ROMAN"
            }
        ];

        // 创建按钮
        const button = document.createElement("button");
        button.style.position = "relative";
        const buttonLabel = document.createElement("span");
        buttonLabel.textContent = "选择字体";
        button.appendChild(buttonLabel);

        // 创建下拉容器
        const fontDropdown = document.createElement("div");
        fontDropdown.className = "kf-editor-font-dropdown";
        fontDropdown.style.display = "none";

        // 创建颜色方块
        fonts.forEach((font) => {
            const block = document.createElement("div");
            block.className = "font-block";
            block.textContent = font.name;
            block.addEventListener("click", () => {
                console.log(button.textContent);
                buttonLabel.textContent = font.name; // 改变按钮颜色
                fontDropdown.style.display = "none"; // 收起下拉框
                var textElements = document.querySelectorAll(
                    ".kf-editor-canvas-container svg text"
                );
                textElements.forEach(function (svg) {
                    svg.setAttribute("font-family", font.value);
                });
            });
            fontDropdown.appendChild(block);
        });

        // 点击按钮切换下拉框显示
        button.addEventListener("click", () => {
            console.log(fontDropdown);
            fontDropdown.style.display =
                fontDropdown.style.display === "none" ? "block" : "none";
        });

        // 点击其他地方关闭下拉框
        document.addEventListener("click", (e) => {
            if (!button.contains(e.target)) {
                fontDropdown.style.display = "none";
            }
        });

        // 将按钮和下拉框添加到父元素
        parentElement.appendChild(button);
        button.appendChild(fontDropdown);
    }

    function createCanvasContainer(doc) {
        var container = doc.createElement("div");
        container.className = "kf-editor-canvas-container";
        return container;
    }

    function createScrollbarContainer(doc) {
        var container = doc.createElement("div");
        container.className = "kf-editor-edit-scrollbar";
        return container;
    }

    return UIComponent;
});
