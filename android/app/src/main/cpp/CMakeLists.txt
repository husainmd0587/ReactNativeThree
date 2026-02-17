cmake_minimum_required(VERSION 3.18)
project("native_test")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# ── Manifold: disable ALL optional features before add_subdirectory ───────
# MUST be set before add_subdirectory() or they are ignored
set(MANIFOLD_TEST          OFF CACHE BOOL "" FORCE)   # ← key fix: was missing
set(BUILD_TESTING          OFF CACHE BOOL "" FORCE)
set(MANIFOLD_CROSS_SECTION OFF CACHE BOOL "" FORCE)
set(MANIFOLD_DEBUG         OFF CACHE BOOL "" FORCE)
set(MANIFOLD_PAR           OFF CACHE BOOL "" FORCE)
set(MANIFOLD_DOWNLOADS     OFF CACHE BOOL "" FORCE)
set(MANIFOLD_SAMPLES       OFF CACHE BOOL "" FORCE)
set(MANIFOLD_EXPORT        OFF CACHE BOOL "" FORCE)
set(MANIFOLD_CBIND         OFF CACHE BOOL "" FORCE)
set(MANIFOLD_PYBIND        OFF CACHE BOOL "" FORCE)

# ── Add Manifold from the subfolder ──────────────────────────────────────
add_subdirectory(manifold)

# ── Our library (single file, everything inside) ─────────────────────────
add_library(
    native-lib
    SHARED
    native-lib.cpp
)

# ── Include paths ────────────────────────────────────────────────────────
target_include_directories(native-lib PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/manifold/include
)

# ── Link: manifold + android log ─────────────────────────────────────────
find_library(log-lib log)

target_link_libraries(
    native-lib
    manifold
    ${log-lib}
)